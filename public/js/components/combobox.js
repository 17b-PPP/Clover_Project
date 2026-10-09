// =============================================================================
// public/js/components/combobox.js
// -----------------------------------------------------------------------------
// ช่องค้นหาแบบเลือกได้ (combobox): พิมพ์ชื่อ/รหัสแล้วมีรายการให้เลือก
//
// โครง HTML ที่ใช้:
//   <div class="field">
//     <div class="field-label-row">
//       <label class="field-label" for="xxx-input">ชื่อช่อง</label>
//       <span class="field-error" data-combobox-error hidden></span>
//     </div>
//     <div class="combobox">
//       <input id="xxx-input" class="input" role="combobox" autocomplete="off"
//              aria-expanded="false" aria-controls="xxx-listbox">
//       <ul id="xxx-listbox" class="combobox-list" role="listbox" hidden></ul>
//     </div>
//   </div>
// =============================================================================

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// root    = องค์ประกอบ .field ที่ครอบ combobox
// options = [{ value, label }, ...]
// onChange(value, meta) = ถูกเรียกเมื่อค่าที่เลือกเปลี่ยน
export function createCombobox(
  root,
  { options = [], value = "", onChange, emptyMessage = "ไม่พบข้อมูลที่ตรงกัน" } = {}
) {
  const input = root.querySelector('input[role="combobox"]');
  const list = root.querySelector('[role="listbox"]');
  const errorElement = root.querySelector("[data-combobox-error]");

  // ป้องกันการ blur เมื่อคลิกหรือเลื่อน scroll ใน list
  list.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  // สถานะภายใน
  const state = {
    options,
    value,
    query: "",
    open: false,
    highlightedIndex: 0,
    disabled: input.disabled,
  };

  // ตัวเลือกที่ตรงกับ value ปัจจุบัน (หรือ null)
  function selectedOption() {
    if (!state.value) return null;
    const valNorm = normalizeText(state.value);
    const valNoDash = valNorm.replace(/-/g, "");
    return (
      state.options.find((o) => {
        const v = normalizeText(o.value);
        return v === valNorm || v.replace(/-/g, "") === valNoDash;
      }) ?? null
    );
  }

  // หา option ที่ตรงกับข้อความที่พิมพ์ (ตรงกับ value, code, หรือ label)
  function findMatchingOption(queryText) {
    const q = normalizeText(queryText);
    if (!q) return null;
    const qNoDash = q.replace(/-/g, "");

    // 1. ตรงกับ value หรือ code เต็มเป๊ะ
    const exactVal = state.options.find((o) => {
      const v = normalizeText(o.value);
      return v === q || v.replace(/-/g, "") === qNoDash;
    });
    if (exactVal) return exactVal;

    // 2. ตรงกับ label เป๊ะ
    const exactLabel = state.options.find((o) => normalizeText(o.label) === q);
    if (exactLabel) return exactLabel;

    // 3. เริ่มต้นด้วยรหัสหรือชื่อ
    const startsWithMatch = state.options.find((o) => {
      const l = normalizeText(o.label);
      const v = normalizeText(o.value);
      return l.startsWith(q) || v.startsWith(q);
    });
    if (startsWithMatch) return startsWithMatch;

    return null;
  }

  // รายการที่ผ่านการกรองด้วยข้อความที่พิมพ์
  // ถ้าช่องว่าง หรือข้อความตรงกับชื่อของตัวที่เลือกอยู่ → แสดงทั้งหมด
  function filteredOptions() {
    const q = normalizeText(state.query);
    const selected = selectedOption();
    if (!q || (selected && q === normalizeText(selected.label))) {
      return state.options;
    }
    const qNoDash = q.replace(/-/g, "");
    return state.options.filter((o) => {
      const labelNorm = normalizeText(o.label);
      const valNorm = normalizeText(o.value);
      const valNoDash = valNorm.replace(/-/g, "");
      return (
        labelNorm.includes(q) ||
        valNorm.includes(q) ||
        valNoDash.includes(qNoDash)
      );
    });
  }

  // เลื่อน highlight โดยไม่ลบ/สร้าง DOM ใหม่
  function setHighlight(index) {
    state.highlightedIndex = index;
    const items = list.querySelectorAll(".combobox-option");
    items.forEach((item, i) => {
      item.classList.toggle("is-highlighted", i === index);
      if (i === index) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  // วาดรายการตัวเลือกใหม่ตามสถานะปัจจุบัน
  function renderList() {
    const visible = state.open && !state.disabled;
    input.setAttribute("aria-expanded", String(state.open));
    list.hidden = !visible;
    if (!visible) {
      list.replaceChildren();
      return;
    }

    const items = filteredOptions();
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "combobox-empty";
      empty.textContent = emptyMessage;
      list.replaceChildren(empty);
      return;
    }

    if (state.highlightedIndex >= items.length) {
      state.highlightedIndex = Math.max(0, items.length - 1);
    }

    list.replaceChildren(
      ...items.map((option, index) => {
        const item = document.createElement("li");
        item.className = "combobox-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(option.value === state.value));
        if (index === state.highlightedIndex) item.classList.add("is-highlighted");
        if (option.value === state.value) item.classList.add("is-selected");
        item.textContent = option.label;

        // ไฮไลต์ด้วย class เมื่อเอาเมาส์ชี้ (ไม่ replaceChildren ซ้ำ)
        item.addEventListener("mouseenter", () => {
          setHighlight(index);
        });

        // คลิกเลือกตัวเลือก
        item.addEventListener("click", () => {
          selectOption(option, { immediate: true });
        });

        return item;
      })
    );
  }

  // ตั้งข้อความในช่องกรอก
  function setQuery(text) {
    state.query = text;
    if (input.value !== text) input.value = text;
  }

  // เลือกตัวเลือก: แจ้งค่าใหม่ออกไป แล้วแสดงชื่อในช่อง และปิดรายการ
  function selectOption(option, { immediate = true } = {}) {
    state.value = option.value;
    setQuery(option.label);
    state.open = false;
    onChange?.(option.value, { immediate });
    renderList();
  }

  // ---------------------------------------------------------------------------
  // เหตุการณ์ของช่องกรอก
  // ---------------------------------------------------------------------------
  input.addEventListener("input", () => {
    setQuery(input.value);
    state.open = true;
    state.highlightedIndex = 0;

    if (input.value.trim() === "") {
      state.value = "";
      onChange?.("", { immediate: true });
    } else {
      // ตรวจสอบว่าสิ่งที่พิมพ์ตรงกับตัวเลือกใดโดยตรงหรือไม่ (เช่น พิมพ์รหัส M-0001 หรือ E-0004)
      const match = findMatchingOption(input.value);
      if (match) {
        state.value = match.value;
        onChange?.(match.value, { immediate: false });
      }
    }

    renderList();
  });

  input.addEventListener("focus", () => {
    state.open = true;
    state.highlightedIndex = 0;
    renderList();
  });

  input.addEventListener("blur", () => {
    state.open = false;
    const currentText = input.value.trim();

    if (!currentText) {
      state.value = "";
      setQuery("");
      onChange?.("", { immediate: true });
    } else {
      // หากสิ่งที่พิมพ์ตรงกับตัวเลือกใดตัวเลือกหนึ่ง ให้เลือกตัวเลือกนั้น
      const match = findMatchingOption(currentText);
      if (match) {
        selectOption(match, { immediate: true });
      } else if (state.value) {
        // หากมีค่าเดิมที่เลือกไว้แล้ว ให้คืนรูปเป็น label ของตัวเลือกนั้น
        const current = selectedOption();
        setQuery(current?.label ?? state.value);
      } else {
        // หากพิมพ์รหัสเช่น M-0001 หรือ E-0004 แต่ไม่มีในลิสต์ options (เช่น โหลดไม่ครบ)
        // ให้ส่งค่านั้นออกไปค้นหากับ API
        if (/^[me]-?\d+$/i.test(currentText)) {
          state.value = currentText.toUpperCase();
          onChange?.(state.value, { immediate: true });
        } else {
          setQuery("");
        }
      }
    }

    renderList();
  });

  input.addEventListener("keydown", (event) => {
    if (!state.open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      state.open = true;
      renderList();
      return;
    }

    const items = filteredOptions();

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!state.open) {
        state.open = true;
        renderList();
      } else if (items.length > 0) {
        const nextIndex = Math.min(state.highlightedIndex + 1, items.length - 1);
        setHighlight(nextIndex);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!state.open) {
        state.open = true;
        renderList();
      } else if (items.length > 0) {
        const prevIndex = Math.max(state.highlightedIndex - 1, 0);
        setHighlight(prevIndex);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (state.open && items.length > 0) {
        const option = items[state.highlightedIndex] ?? items[0];
        if (option) selectOption(option, { immediate: true });
      } else {
        const match = findMatchingOption(input.value.trim());
        if (match) {
          selectOption(match, { immediate: true });
        } else if (/^[me]-?\d+$/i.test(input.value.trim())) {
          state.value = input.value.trim().toUpperCase();
          onChange?.(state.value, { immediate: true });
          state.open = false;
          renderList();
        }
      }
    } else if (event.key === "Escape") {
      state.open = false;
      const current = selectedOption();
      setQuery(current?.label ?? "");
      renderList();
    }
  });

  // ค่าเริ่มต้นของข้อความในช่อง = ชื่อของตัวที่เลือกไว้
  setQuery(selectedOption()?.label ?? "");

  // ---------------------------------------------------------------------------
  // คำสั่งที่หน้าเว็บเรียกใช้ได้
  // ---------------------------------------------------------------------------
  return {
    // เปลี่ยนค่าที่เลือกจากภายนอก (เช่น ปุ่มล้างฟอร์ม)
    setValue(newValue) {
      if (newValue === state.value) return;
      state.value = newValue;
      const selected = selectedOption();
      setQuery(selected?.label ?? newValue ?? "");
      renderList();
    },

    // ตั้งค่าใหม่ทั้งหมดเหมือนสร้างช่องใหม่ (ใช้ตอนเปิดฟอร์มใหม่)
    reset(newValue = "") {
      state.value = newValue;
      state.open = false;
      state.highlightedIndex = 0;
      const selected = selectedOption();
      setQuery(selected?.label ?? newValue ?? "");
      renderList();
    },

    // เปลี่ยนรายการตัวเลือก
    setOptions(newOptions) {
      state.options = newOptions;
      if (state.value) {
        const selected = selectedOption();
        if (selected) {
          setQuery(selected.label);
        }
      }
      renderList();
    },

    // เปิด/ปิดการใช้งานช่อง
    setDisabled(disabled) {
      state.disabled = disabled;
      input.disabled = disabled;
      renderList();
    },

    // แสดงข้อความแจ้งข้อผิดพลาด (ขอบช่องเป็นสีแดง) หรือซ่อนเมื่อส่ง null
    setError(message) {
      if (errorElement) {
        errorElement.textContent = message ?? "";
        errorElement.hidden = !message;
      }
      input.classList.toggle("is-invalid", Boolean(message));
    },

    get value() {
      return state.value;
    },
  };
}

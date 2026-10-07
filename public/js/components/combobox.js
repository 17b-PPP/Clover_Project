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
//
// การทำงาน (เหมือนคอมโพเนนต์ Combobox เดิมทุกประการ):
//   - value  = ค่าที่เลือกอยู่ (เช่น รหัสสมาชิก), query = ข้อความที่พิมพ์ในช่อง
//   - พิมพ์ → กรองรายการที่มีข้อความนั้น / ลบจนว่าง → ล้างค่าที่เลือก
//   - ลูกศรขึ้น/ลง เลื่อนไฮไลต์, Enter เลือก, Esc ปิดรายการ
//   - ออกจากช่อง (blur) → ปิดรายการ และคืนข้อความเป็นชื่อของตัวที่เลือกอยู่
// =============================================================================

// root    = องค์ประกอบ .field ที่ครอบ combobox
// options = [{ value, label }, ...]
// onChange(value) = ถูกเรียกเมื่อค่าที่เลือกเปลี่ยน
export function createCombobox(
  root,
  { options = [], value = "", onChange, emptyMessage = "ไม่พบข้อมูลที่ตรงกัน" } = {}
) {
  const input = root.querySelector('input[role="combobox"]');
  const list = root.querySelector('[role="listbox"]');
  const errorElement = root.querySelector("[data-combobox-error]");

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
    return state.options.find((o) => o.value === state.value) ?? null;
  }

  // รายการที่ผ่านการกรองด้วยข้อความที่พิมพ์
  // ถ้าช่องว่าง หรือข้อความตรงกับชื่อของตัวที่เลือกอยู่ → แสดงทั้งหมด
  function filteredOptions() {
    const q = state.query.trim().toLowerCase();
    const selected = selectedOption();
    if (!q || q === selected?.label.toLowerCase()) return state.options;
    return state.options.filter((o) => o.label.toLowerCase().includes(q));
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

    list.replaceChildren(
      ...items.map((option, index) => {
        const item = document.createElement("li");
        item.className = "combobox-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(option.value === state.value));
        if (index === state.highlightedIndex) item.classList.add("is-highlighted");
        if (option.value === state.value) item.classList.add("is-selected");
        item.textContent = option.label;

        // ใช้ mousedown + preventDefault เพื่อไม่ให้ช่องกรอกเสียโฟกัสก่อนเลือก
        item.addEventListener("mousedown", (event) => {
          event.preventDefault();
          selectOption(option);
        });
        item.addEventListener("mouseenter", () => {
          state.highlightedIndex = index;
          renderList();
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
  function selectOption(option) {
    state.value = option.value;
    onChange?.(option.value);
    setQuery(option.label);
    state.open = false;
    renderList();
  }

  // ---------------------------------------------------------------------------
  // เหตุการณ์ของช่องกรอก
  // ---------------------------------------------------------------------------
  input.addEventListener("input", () => {
    setQuery(input.value);
    state.open = true;
    state.highlightedIndex = 0;
    if (input.value === "") {
      state.value = "";
      onChange?.("");
    }
    renderList();
  });

  input.addEventListener("focus", () => {
    state.open = true;
    renderList();
  });

  input.addEventListener("blur", () => {
    state.open = false;
    setQuery(selectedOption()?.label ?? "");
    renderList();
  });

  input.addEventListener("keydown", (event) => {
    if (!state.open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      state.open = true;
      renderList();
      return;
    }
    if (!state.open) return;

    const items = filteredOptions();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.highlightedIndex = Math.min(state.highlightedIndex + 1, items.length - 1);
      renderList();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      state.highlightedIndex = Math.max(state.highlightedIndex - 1, 0);
      renderList();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = items[state.highlightedIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      state.open = false;
      setQuery(selectedOption()?.label ?? "");
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
    // ถ้าค่าเปลี่ยนจริง ข้อความในช่องจะถูกตั้งเป็นชื่อของตัวเลือกใหม่
    setValue(newValue) {
      if (newValue === state.value) return;
      state.value = newValue;
      setQuery(selectedOption()?.label ?? "");
      renderList();
    },

    // ตั้งค่าใหม่ทั้งหมดเหมือนสร้างช่องใหม่ (ใช้ตอนเปิดฟอร์มใหม่)
    reset(newValue = "") {
      state.value = newValue;
      state.open = false;
      state.highlightedIndex = 0;
      setQuery(selectedOption()?.label ?? "");
      renderList();
    },

    // เปลี่ยนรายการตัวเลือก
    setOptions(newOptions) {
      state.options = newOptions;
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

// =============================================================================
// public/js/components/person-form-dialog.js
// -----------------------------------------------------------------------------
// หน้าต่างฟอร์ม "ข้อมูลบุคคล" ที่ใช้ร่วมกันในหน้าสมาชิกและหน้าลูกจ้าง
// (แทน MemberFormDialog และ EmployeeFormDialog ของเดิม ซึ่งเหมือนกันเกือบทั้งหมด)
//
// มี 3 โหมด:
//   add  = เพิ่มใหม่ (ฟอร์มว่าง)
//   view = ดูข้อมูล (ทุกช่องถูกปิด แก้ไม่ได้ มีปุ่ม "แก้ไขข้อมูล")
//   edit = แก้ไข
//
// โครง HTML อยู่ในหน้า members.html / employees.html โดยตั้ง id ขึ้นต้นด้วย prefix
// เช่น prefix = "member" → #member-form-modal, #member-first-name, #member-phone ...
//
// ความสามารถพิเศษ (เหมือนของเดิม):
//   - เลือกรูปถ่ายแล้วย่อขนาดอัตโนมัติ และแสดงตัวอย่างรูปวงกลม
//   - ช่องเลขบัตร/เบอร์โทร/รหัสไปรษณีย์ รับเฉพาะตัวเลข
//   - พิมพ์รหัสไปรษณีย์ครบ 5 หลัก → เติมอำเภอ/จังหวัดให้อัตโนมัติ (เฉพาะโหมด add/edit)
//
// การ "เปิดใหม่" ของฟอร์ม: ทุกครั้งที่ โหมด / บุคคลที่เลือก / การเปิด-ปิด เปลี่ยน
// ฟอร์มจะถูกตั้งค่าใหม่ทั้งหมด (เหมือนการใช้ key ใน React ของเดิม)
// =============================================================================

import { byId } from "../core/dom.js";
import { resizeImageToDataUrl } from "../core/image.js";
import { createModal } from "./modal.js";
import { createPostalCodeLookup } from "./postal-code-lookup.js";

// ช่องกรอกในฟอร์ม: [ชื่อฟิลด์ในข้อมูล, ส่วนท้ายของ id ใน HTML, รับเฉพาะตัวเลขหรือไม่]
const FIELDS = [
  ["firstName", "first-name", false],
  ["lastName", "last-name", false],
  ["idCardNumber", "id-card", true],
  ["dateOfBirth", "dob", false],
  ["phone", "phone", true],
  ["address", "address", false],
  ["district", "district", false],
  ["province", "province", false],
  ["postalCode", "postal-code", true],
];

// prefix     = คำนำหน้า id ของ HTML ("member" หรือ "employee")
// titles     = หัวข้อหน้าต่างของแต่ละโหมด { add, view, edit }
// emptyForm  = ค่าเริ่มต้นของฟอร์มเพิ่มใหม่
// fromEntity = แปลงข้อมูลบุคคลเป็นค่าในฟอร์ม
// onSubmit   = ส่งข้อมูลไปบันทึก (โยน error ถ้าไม่สำเร็จ)
// onClose    = ผู้ใช้ขอปิดหน้าต่าง
// onRequestEdit = ผู้ใช้กด "แก้ไขข้อมูล" ในโหมดดูข้อมูล
// renderExtra   = (ไม่บังคับ) วาดส่วนเพิ่มเติมของฟอร์ม เช่น รายการสัญญาจ้างของลูกจ้าง
export function createPersonFormDialog({
  prefix,
  titles,
  emptyForm,
  fromEntity,
  onSubmit,
  onClose,
  onRequestEdit,
  renderExtra,
}) {
  const id = (suffix) => byId(`${prefix}-${suffix}`);

  const overlay = id("form-modal");
  const form = id("form");
  const loadingElement = id("form-loading");
  const errorElement = id("form-error");
  const photoImg = id("photo-img");
  const photoEmpty = id("photo-empty");
  const photoUpload = id("photo-upload");
  const photoInput = id("photo-input");
  const closeButton = id("form-close");
  const editButton = id("form-edit");
  const cancelButton = id("form-cancel");
  const submitButton = id("form-submit");
  const inputs = Object.fromEntries(FIELDS.map(([name, suffix]) => [name, id(suffix)]));

  const modal = createModal(overlay, { onClose });

  // ค่าที่หน้าเว็บส่งมา (open, mode, entity, loading)
  let props = { open: false, mode: "add", entity: null, loading: false };
  let currentKey = null;

  // สถานะภายในของฟอร์ม
  let formValues = { ...emptyForm };
  let submitting = false;
  let error = null;

  const isReadOnly = () => props.mode === "view";

  // ค้นหาอำเภอ/จังหวัดจากรหัสไปรษณีย์ แล้วเติมให้ (ไม่ทำในโหมดดูข้อมูล)
  const postalLookup = createPostalCodeLookup((matches) => {
    if (isReadOnly() || matches.length === 0) return;
    formValues.district = matches[0].amphoe;
    formValues.province = matches[0].province;
    inputs.district.value = formValues.district;
    inputs.province.value = formValues.province;
  });

  // ---------------------------------------------------------------------------
  // ตั้งค่าฟอร์มใหม่ทั้งหมดจาก props (เทียบเท่าการสร้างคอมโพเนนต์ใหม่)
  // ---------------------------------------------------------------------------
  function mount() {
    formValues = props.entity ? fromEntity(props.entity) : { ...emptyForm };
    submitting = false;
    error = null;
    photoInput.value = "";
    for (const [name] of FIELDS) inputs[name].value = formValues[name];
    renderPhoto();
    postalLookup.reset();
    postalLookup.update(formValues.postalCode);
    renderExtra?.(props.mode, props.entity);
  }

  // แสดงรูปตัวอย่าง หรือข้อความ "ไม่มีรูป"
  function renderPhoto() {
    if (formValues.photoUrl) {
      photoImg.src = formValues.photoUrl;
      photoImg.hidden = false;
      photoEmpty.hidden = true;
    } else {
      photoImg.removeAttribute("src");
      photoImg.hidden = true;
      photoEmpty.hidden = false;
    }
  }

  // วาดส่วนที่ขึ้นกับโหมด/สถานะ (หัวข้อ, การโหลด, ปุ่ม, ข้อความผิดพลาด)
  function render() {
    const readOnly = isReadOnly();
    modal.setTitle(titles[props.mode]);

    // ระหว่างโหลดข้อมูล: แสดงไอคอนโหลดแทนฟอร์ม และซ่อนแถวปุ่ม
    loadingElement.hidden = !props.loading;
    form.hidden = props.loading;
    overlay.querySelector(".modal-footer").hidden = props.loading;

    for (const [name] of FIELDS) inputs[name].disabled = readOnly;
    photoUpload.hidden = readOnly;

    closeButton.hidden = !readOnly;
    editButton.hidden = !readOnly;
    cancelButton.hidden = readOnly;
    submitButton.hidden = readOnly;
    submitButton.disabled = submitting;
    submitButton.textContent = submitting ? "กำลังบันทึก..." : "บันทึก";

    errorElement.textContent = error ?? "";
    errorElement.hidden = !error;
  }

  // ---------------------------------------------------------------------------
  // เหตุการณ์ในฟอร์ม
  // ---------------------------------------------------------------------------
  for (const [name, , digitsOnly] of FIELDS) {
    const input = inputs[name];
    input.addEventListener("input", () => {
      // ช่องตัวเลขล้วน: ตัดตัวอักษรที่ไม่ใช่ตัวเลขทิ้ง
      if (digitsOnly) {
        const digits = input.value.replace(/\D/g, "");
        if (digits !== input.value) input.value = digits;
      }
      formValues[name] = input.value;
      if (name === "postalCode") postalLookup.update(formValues.postalCode);
    });
  }

  // เลือกรูปถ่าย → ย่อขนาด → แสดงตัวอย่าง
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    formValues.photoUrl = dataUrl;
    renderPhoto();
  });

  // บันทึกฟอร์ม
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isReadOnly()) return;
    submitting = true;
    error = null;
    render();
    try {
      await onSubmit({ ...formValues });
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    } finally {
      submitting = false;
      render();
    }
  });

  closeButton.addEventListener("click", () => onClose());
  cancelButton.addEventListener("click", () => onClose());
  editButton.addEventListener("click", () => onRequestEdit());

  return {
    // รับค่าใหม่จากหน้าเว็บ: { open, mode, entity, loading }
    sync(nextProps) {
      const wasOpen = modal.isOpen;
      props = { ...props, ...nextProps };
      const key = `${props.mode}-${props.entity?.id ?? "new"}-${props.open}`;
      const remounted = key !== currentKey;
      if (remounted) {
        currentKey = key;
        mount();
      }
      render();
      if (props.open) {
        modal.open();
        // ถ้าหน้าต่างเปิดอยู่แล้วแต่เนื้อหาถูกสร้างใหม่ ให้เล่นแอนิเมชันอีกครั้ง
        if (remounted && wasOpen) modal.replayAnimation();
      } else {
        modal.close();
      }
    },
  };
}

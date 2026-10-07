// =============================================================================
// public/js/components/confirm-dialog.js
// -----------------------------------------------------------------------------
// หน้าต่างยืนยันการทำรายการ ("ยกเลิก" / "ยืนยัน")
// ใช้ในหน้ารับซื้อน้ำยาง เบิกเงิน และคำนวณเงินปันผล
//
// โครง HTML: modal ที่มี
//   [data-slot="message"]  ข้อความถาม
//   [data-action="cancel"] ปุ่มยกเลิก
//   [data-action="confirm"] ปุ่มยืนยัน
//
// การทำงาน: กดยืนยัน → ปุ่มทั้งสองถูกปิดชั่วคราว ปุ่มยืนยันเปลี่ยนเป็น "กำลังบันทึก..."
//          → รอ onConfirm() ทำงานเสร็จ → ปิดหน้าต่าง
// =============================================================================

import { action, slot } from "../core/dom.js";
import { createModal } from "./modal.js";

export function createConfirmDialog(overlay, { onConfirm }) {
  const modal = createModal(overlay, { onClose: close });
  const cancelButton = action(overlay, "cancel");
  const confirmButton = action(overlay, "confirm");
  const confirmLabel = confirmButton.textContent;
  let submitting = false;

  // แสดงสถานะ "กำลังบันทึก" บนปุ่ม
  function render() {
    cancelButton.disabled = submitting;
    confirmButton.disabled = submitting;
    confirmButton.textContent = submitting ? "กำลังบันทึก..." : confirmLabel;
  }

  function close() {
    modal.close();
  }

  cancelButton.addEventListener("click", close);

  confirmButton.addEventListener("click", async () => {
    submitting = true;
    render();
    try {
      await onConfirm();
      close();
    } finally {
      submitting = false;
      render();
    }
  });

  return {
    open() {
      modal.open();
    },
    close,
    // เปลี่ยนข้อความถาม (เช่น ข้อความที่มีปี พ.ศ. ของหน้าปันผล)
    setMessage(text) {
      slot(overlay, "message").textContent = text;
    },
  };
}

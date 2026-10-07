// =============================================================================
// public/js/components/change-password-dialog.js
// -----------------------------------------------------------------------------
// หน้าต่าง "เปลี่ยนรหัสผ่าน" ของพนักงาน (เปิดจากปุ่มเฟืองในเมนูด้านซ้าย)
// โครง HTML อยู่ใน pages/partials/sidebar.html (id="change-password-modal")
//
// ขั้นตอน:
//   1. ตรวจว่ารหัสผ่านใหม่กับช่องยืนยันตรงกัน
//   2. ส่งไป POST /api/auth/change-password
//   3. สำเร็จ → ล้างฟอร์ม ปิดหน้าต่าง แล้วเรียก onSuccess (โหลดข้อมูลเมนูใหม่)
//      ไม่สำเร็จ → แสดงข้อความสีแดงในหน้าต่าง
// ทุกครั้งที่ปิดหน้าต่าง ฟอร์มจะถูกล้างค่า (เหมือนของเดิม)
// =============================================================================

import { byId } from "../core/dom.js";
import { createModal } from "./modal.js";
import { setupPasswordFields } from "./password-input.js";

export function createChangePasswordDialog({ onSuccess }) {
  const overlay = byId("change-password-modal");
  const form = byId("change-password-form");
  const currentInput = byId("current-password");
  const newInput = byId("new-password");
  const confirmInput = byId("confirm-password");
  const errorElement = byId("change-password-error");
  const submitButton = byId("change-password-submit");
  const passwordToggles = setupPasswordFields(overlay);

  const modal = createModal(overlay, { onClose: handleClose });
  let submitting = false;

  // แสดงข้อความผิดพลาด (null = ซ่อน)
  function setError(message) {
    errorElement.textContent = message ?? "";
    errorElement.hidden = !message;
  }

  // แสดงสถานะ "กำลังบันทึก" บนปุ่มบันทึก
  function renderSubmitting() {
    submitButton.disabled = submitting;
    submitButton.textContent = submitting ? "กำลังบันทึก..." : "บันทึก";
  }

  // ล้างค่าทุกช่องและข้อความผิดพลาด
  function reset() {
    currentInput.value = "";
    newInput.value = "";
    confirmInput.value = "";
    setError(null);
  }

  // ปิดหน้าต่าง (ล้างฟอร์มทุกครั้ง)
  function handleClose() {
    reset();
    modal.close();
  }

  byId("change-password-cancel").addEventListener("click", handleClose);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(null);
    if (newInput.value !== confirmInput.value) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    submitting = true;
    renderSubmitting();
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentInput.value,
          newPassword: newInput.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      submitting = false;
      renderSubmitting();
    }
  });

  return {
    // เปิดหน้าต่าง (ช่องรหัสผ่านทุกช่องกลับเป็นแบบซ่อนตัวอักษร)
    open() {
      passwordToggles.forEach((toggle) => toggle.reset());
      modal.open();
    },
  };
}

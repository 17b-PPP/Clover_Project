// =============================================================================
// public/js/components/status-dialogs.js
// -----------------------------------------------------------------------------
// หน้าต่างยืนยัน "ระงับ / เปิดใช้งาน" และ "ลบ" ที่ใช้ในหน้าสมาชิก ลูกจ้าง
// ผู้ใช้งาน และสัญญาจ้าง (ข้อความของแต่ละหน้าเขียนไว้ใน HTML ของหน้านั้น)
//
// ---------------------------------------------------------------------------
// createStatusDialog — หน้าต่างระงับ/เปิดใช้งาน
//   HTML ต้องมี: [data-mode="suspend"] และ [data-mode="activate"] (ข้อความ 2 แบบ)
//                [data-action="cancel"], [data-action="confirm"]
//   titles = { suspend: "ระงับ...", activate: "เปิดใช้งาน..." }
//   fill(overlay, item) = เติมชื่อ/รหัสของรายการลงในข้อความ
//
// createDeleteDialog — หน้าต่างลบ
//   HTML ต้องมี: [data-slot="error"] (ข้อความผิดพลาด), ปุ่ม cancel / confirm
//   หมายเหตุ: ข้อความผิดพลาดจะค้างอยู่จนกว่าจะกดยืนยันครั้งถัดไป (เหมือนของเดิม)
// =============================================================================

import { action } from "../core/dom.js";
import { createModal } from "./modal.js";

export function createStatusDialog(overlay, { titles, fill, onConfirm }) {
  const modal = createModal(overlay, { onClose: close });
  const confirmButton = action(overlay, "confirm");
  let item = null;
  let submitting = false;

  function close() {
    modal.close();
  }

  // วาดข้อความ/ปุ่มตามสถานะปัจจุบันของรายการ
  function render() {
    if (!item) return;
    const willSuspend = item.status === "Active";
    modal.setTitle(willSuspend ? titles.suspend : titles.activate);
    overlay.querySelector('[data-mode="suspend"]').hidden = !willSuspend;
    overlay.querySelector('[data-mode="activate"]').hidden = willSuspend;
    fill(overlay, item);

    confirmButton.className = `btn ${willSuspend ? "btn-danger" : "btn-primary"}`;
    confirmButton.disabled = submitting;
    confirmButton.textContent = submitting
      ? "กำลังดำเนินการ..."
      : willSuspend
        ? "ยืนยันการระงับ"
        : "ยืนยันการเปิดใช้งาน";
  }

  action(overlay, "cancel").addEventListener("click", close);

  confirmButton.addEventListener("click", async () => {
    submitting = true;
    render();
    try {
      await onConfirm(item);
      close();
    } finally {
      submitting = false;
      render();
    }
  });

  return {
    // เปิดหน้าต่างสำหรับรายการที่เลือก
    open(target) {
      item = target;
      render();
      modal.open();
    },
  };
}

export function createDeleteDialog(overlay, { fill, onConfirm, errorFallback }) {
  const modal = createModal(overlay, { onClose: close });
  const confirmButton = action(overlay, "confirm");
  const confirmLabel = confirmButton.textContent;
  const errorElement = overlay.querySelector('[data-slot="error"]');
  let item = null;
  let submitting = false;

  function close() {
    modal.close();
  }

  function setError(message) {
    errorElement.textContent = message ?? "";
    errorElement.hidden = !message;
  }

  function renderSubmitting() {
    confirmButton.disabled = submitting;
    confirmButton.textContent = submitting ? "กำลังลบ..." : confirmLabel;
  }

  action(overlay, "cancel").addEventListener("click", close);

  confirmButton.addEventListener("click", async () => {
    submitting = true;
    renderSubmitting();
    setError(null);
    try {
      await onConfirm(item);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : errorFallback);
    } finally {
      submitting = false;
      renderSubmitting();
    }
  });

  return {
    open(target) {
      item = target;
      fill(overlay, item);
      modal.open();
    },
  };
}

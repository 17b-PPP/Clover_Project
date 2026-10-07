// =============================================================================
// public/js/components/modal.js
// -----------------------------------------------------------------------------
// ควบคุมหน้าต่างซ้อน (modal) ที่เขียนโครงไว้ใน HTML
//
// โครง HTML ที่ใช้:
//   <div class="modal-overlay" id="..." hidden>
//     <div class="modal" role="dialog" aria-modal="true">
//       <div class="modal-header">
//         <h2 class="modal-title" data-modal-title>หัวข้อ</h2>
//         <button type="button" class="modal-close" data-modal-close aria-label="ปิด">✕</button>
//       </div>
//       <div class="modal-body">...</div>
//       <div class="modal-footer">...</div>
//     </div>
//   </div>
//
// พฤติกรรม (เหมือน Modal เดิม):
//   - ปิดได้ด้วยปุ่ม ✕ หรือกดปุ่ม Esc (ทั้งสองทางเรียก onClose)
//   - คลิกพื้นหลังสีเข้มไม่ทำให้ปิด
// =============================================================================

import { restartAnimation } from "../core/dom.js";

// overlay = องค์ประกอบ .modal-overlay
// onClose = ฟังก์ชันที่ถูกเรียกเมื่อผู้ใช้ขอปิด (ปุ่ม ✕ หรือ Esc)
export function createModal(overlay, { onClose } = {}) {
  let isOpen = false;
  const dialog = overlay.querySelector(".modal");
  const titleElement = overlay.querySelector("[data-modal-title]");

  // ปุ่ม ✕
  overlay.querySelector("[data-modal-close]")?.addEventListener("click", () => {
    onClose?.();
  });

  // ปุ่ม Esc (ฟังเฉพาะตอนหน้าต่างเปิดอยู่)
  function handleKeyDown(event) {
    if (event.key === "Escape") onClose?.();
  }

  return {
    // เปิดหน้าต่าง (แอนิเมชันค่อย ๆ ปรากฏจะเล่นอัตโนมัติจาก CSS)
    open() {
      if (isOpen) return;
      isOpen = true;
      overlay.hidden = false;
      window.addEventListener("keydown", handleKeyDown);
    },

    // ปิดหน้าต่าง
    close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.hidden = true;
      window.removeEventListener("keydown", handleKeyDown);
    },

    // หน้าต่างเปิดอยู่หรือไม่
    get isOpen() {
      return isOpen;
    },

    // เปลี่ยนข้อความหัวข้อ
    setTitle(text) {
      if (titleElement) titleElement.textContent = text;
    },

    // เล่นแอนิเมชันปรากฏอีกครั้ง (ใช้เมื่อเนื้อหาในหน้าต่างถูกสร้างใหม่ทั้งชุด)
    replayAnimation() {
      if (isOpen && dialog) restartAnimation(dialog);
    },
  };
}

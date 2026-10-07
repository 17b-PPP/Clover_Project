// =============================================================================
// public/js/components/pagination.js
// -----------------------------------------------------------------------------
// ตัวแบ่งหน้าของตาราง:  [ก่อนหน้า]  หน้า x จาก y  [ถัดไป]
//
// ใช้ <template id="pagination-template"> จากไฟล์ pages/partials/pagination.html
// ถ้ามีหน้าเดียว (totalPages <= 1) จะไม่แสดงอะไรเลย (เหมือนของเดิม)
// =============================================================================

import { action, cloneTemplate, setSlot } from "../core/dom.js";

// container    = องค์ประกอบที่จะใส่ตัวแบ่งหน้าลงไป
// page         = หน้าปัจจุบัน (เริ่มที่ 1)
// totalPages   = จำนวนหน้าทั้งหมด
// onPageChange = ฟังก์ชันที่ถูกเรียกพร้อมเลขหน้าใหม่เมื่อกดปุ่ม
export function renderPagination(container, { page, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    container.replaceChildren();
    return;
  }

  const bar = cloneTemplate("pagination-template");
  setSlot(bar, "page", String(page));
  setSlot(bar, "total", String(totalPages));

  const prev = action(bar, "prev");
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => onPageChange(page - 1));

  const next = action(bar, "next");
  next.disabled = page >= totalPages;
  next.addEventListener("click", () => onPageChange(page + 1));

  container.replaceChildren(bar);
}

// ตัดรายการเฉพาะหน้าที่ต้องการ (เช่น หน้า 2 ขนาด 10 → รายการที่ 11–20)
export function paginate(items, page, pageSize) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

// คำนวณจำนวนหน้าทั้งหมด (อย่างน้อย 1 หน้า)
export function totalPagesOf(items, pageSize) {
  return Math.max(1, Math.ceil(items.length / pageSize));
}

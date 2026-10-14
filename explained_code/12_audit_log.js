// =============================================================================
// ไฟล์: explained_code/12_ประวัติการใช้งาน_audit_log.js
// หน้าที่: ควบคุมการทำงานของหน้า "ประวัติการใช้งาน" (System Audit Log)
// ไฟล์ HTML ที่คู่กัน: pages/audit-log.html
// เส้นทาง URL: /audit-log [เฉพาะผู้ดูแลระบบ ADMIN เท่านั้น]
// ตารางฐานข้อมูลหลัก: ActivityLog
// ความสำคัญทางธุรกิจ:
//   ตรวจสอบความโปร่งใส (Transparency & Accountability) ของระบบ
//   บันทึกว่าใคร (Staff) ทำอะไร (Action) กับข้อมูลใด (Target) เมื่อไหร่ (Timestamp)
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateTime, todayBangkok } from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createModal } from "../public/js/components/modal.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;
const searchInput = byId("audit-search");
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");

const state = {
  entries: [],                 // ประวัติการใช้งานทั้งหมด
  search: "",                  // คำค้นหา
  dateFrom: DEFAULT_DATE_FROM, // วันที่เริ่มต้น
  dateTo: todayBangkok(),      // วันที่สิ้นสุด
  page: 1,
};

// Modal แสดงข้อความรายละเอียดแบบเต็ม (Full Details Modal)
const detailsModal = createModal(byId("details-modal"), {
  onClose: () => detailsModal.close(),
});

let resizeObservers = [];

/**
 * กรองรายการ Log ตามคำค้นหาและช่วงวันที่
 */
function filteredEntries() {
  const q = state.search.trim().toLowerCase();
  return state.entries.filter((e) => {
    const matchesSearch =
      !q || [e.username, e.action, e.details].join(" ").toLowerCase().includes(q);
    const d = new Date(e.timestamp);
    const entryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const matchesFrom = !state.dateFrom || entryDate >= state.dateFrom;
    const matchesTo = !state.dateTo || entryDate <= state.dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });
}

/**
 * สร้างแถวตารางประวัติ 1 แถว พร้อมตรวจจับข้อความล้นช่อง (Text Overflow)
 */
function createRow(entry) {
  const row = cloneTemplate("audit-row-template");
  setSlot(row, "timestamp", formatDateTime(entry.timestamp));
  setSlot(row, "username", entry.username);
  row.querySelector('[data-slot="role-admin"]').hidden = entry.role !== "ADMIN";
  row.querySelector('[data-slot="role-staff"]').hidden = entry.role === "ADMIN";
  setSlot(row, "action", entry.action);
  setSlot(row, "details", entry.details);

  const text = row.querySelector('[data-slot="details"]');
  const moreButton = action(row, "more");

  // เมื่อคลิกปุ่ม "ดูข้อความเต็ม" จะเปิด Modal แสดงข้อความทั้งหมด
  moreButton.addEventListener("click", () => {
    byId("details-full").textContent = entry.details;
    detailsModal.open();
  });

  // [เทคนิคพิเศษ] ใช้ ResizeObserver ตรวจวัดความกว้างจริงว่าข้อความล้นกล่องหรือไม่
  // เนื่องจากตัวอักษรไทยมีความกว้างไม่เท่ากัน จึงวัดจากพิกเซลจริงแทนการนับตัวอักษร
  const measure = () => {
    moreButton.hidden = !(text.scrollWidth > text.clientWidth);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(text);
  resizeObservers.push(observer);

  return row;
}

function render() {
  const entries = filteredEntries();
  const totalPages = totalPagesOf(entries, PAGE_SIZE);
  const pageEntries = paginate(entries, state.page, PAGE_SIZE);

  resizeObservers.forEach((observer) => observer.disconnect());
  resizeObservers = [];

  byId("audit-empty").hidden = pageEntries.length !== 0;
  byId("audit-table").hidden = pageEntries.length === 0;
  byId("audit-rows").replaceChildren(...pageEntries.map(createRow));

  renderPagination(byId("audit-pagination"), {
    page: state.page,
    totalPages,
    onPageChange: (p) => {
      state.page = p;
      render();
    },
  });
}

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("audit-log");
  state.entries = data.entries ?? [];
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

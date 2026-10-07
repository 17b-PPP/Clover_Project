// =============================================================================
// public/js/pages/audit-log.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ประวัติการใช้งาน" (pages/audit-log.html) — เฉพาะผู้ดูแลระบบ
//
//   - ค้นหาจาก ชื่อผู้ใช้งาน / Action / รายละเอียด
//   - กรองช่วงวันที่ (ตามวันที่ของเครื่องผู้ใช้)
//   - แบ่งหน้าละ 10 รายการ (เปลี่ยนตัวกรองแล้วกลับไปหน้า 1)
//   - รายละเอียดที่ยาวเกินช่อง จะมีลิงก์ "ดูข้อความเต็ม" เปิดหน้าต่างแสดงข้อความทั้งหมด
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateTime, todayBangkok } from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createModal } from "../components/modal.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;

const searchInput = byId("audit-search");
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-dates");

const state = {
  entries: [],
  search: "",
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  page: 1,
};

// หน้าต่างแสดงรายละเอียดเต็ม
const detailsModal = createModal(byId("details-modal"), {
  onClose: () => detailsModal.close(),
});

// ตัวสังเกตขนาดของช่องรายละเอียดในแถวที่แสดงอยู่ (ล้างทิ้งทุกครั้งที่วาดตารางใหม่)
let resizeObservers = [];

// วันที่ของรายการตามเวลาเครื่อง ในรูปแบบ YYYY-MM-DD (ใช้เทียบกับตัวกรองวันที่)
function localDateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// รายการที่ผ่านตัวกรองทั้งหมด
function filteredEntries() {
  const q = state.search.trim().toLowerCase();
  return state.entries.filter((e) => {
    const matchesSearch =
      !q || [e.username, e.action, e.details].join(" ").toLowerCase().includes(q);
    const entryDate = localDateKey(e.timestamp);
    const matchesFrom = !state.dateFrom || entryDate >= state.dateFrom;
    const matchesTo = !state.dateTo || entryDate <= state.dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });
}

// สร้างแถวตาราง พร้อมตรวจว่าข้อความรายละเอียดล้นช่องหรือไม่
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
  moreButton.addEventListener("click", () => {
    byId("details-full").textContent = entry.details;
    detailsModal.open();
  });

  // วัดจริงว่าล้นหรือไม่ (ตัวอักษรไทยกว้างไม่เท่ากัน จึงนับจำนวนตัวอักษรไม่ได้)
  const measure = () => {
    moreButton.hidden = !(text.scrollWidth > text.clientWidth);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(text);
  resizeObservers.push(observer);
  return row;
}

// วาดตาราง + ตัวแบ่งหน้า
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
    onPageChange: (page) => {
      state.page = page;
      render();
    },
  });

  // ปุ่มล้างใช้ได้เมื่อช่วงวันที่ไม่ใช่ค่าเริ่มต้น
  resetButton.disabled = state.dateFrom === DEFAULT_DATE_FROM && state.dateTo === todayBangkok();
}

// เปลี่ยนตัวกรอง → ถ้าค่าเปลี่ยนจริง ให้กลับไปหน้า 1
function setFilter(changes) {
  const changed = Object.entries(changes).some(([key, value]) => state[key] !== value);
  Object.assign(state, changes);
  if (changed) state.page = 1;
  render();
}

searchInput.addEventListener("input", () => setFilter({ search: searchInput.value }));
dateFromInput.addEventListener("input", () => setFilter({ dateFrom: dateFromInput.value }));
dateToInput.addEventListener("input", () => setFilter({ dateTo: dateToInput.value }));
// ปุ่มล้าง: กลับไปช่วงวันที่เริ่มต้น
resetButton.addEventListener("click", () => {
  const defaults = { dateFrom: DEFAULT_DATE_FROM, dateTo: todayBangkok() };
  dateFromInput.value = defaults.dateFrom;
  dateToInput.value = defaults.dateTo;
  setFilter(defaults);
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateFromInput.value = state.dateFrom;
dateToInput.value = state.dateTo;

try {
  const data = await loadPageData("audit-log");
  state.entries = data.entries;
  byId("page-content").hidden = false;
  render();
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

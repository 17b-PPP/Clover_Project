// =============================================================================
// public/js/pages/member-sales.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ประวัติการขาย" ของสมาชิก (pages/member-sales.html)
//
//   - กรองช่วงวันที่ (ตามวันทำการของการรับซื้อ)
//   - กราฟน้ำหนักน้ำยางสดที่ขายได้ในแต่ละเดือน
//   - ตารางการขาย แบ่งหน้าละ 10 รายการ พร้อมปุ่มดู/พิมพ์ใบเสร็จ
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateUtc, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../components/member-sidebar.js";
import { renderMemberTopbar } from "../components/member-topbar.js";
import { createReceiptViewer } from "../components/receipt-viewer.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";
import { createMonthlyBarChart, groupByMonth } from "../charts/monthly-bar-chart.js";

initMemberSidebar();

const PAGE_SIZE = 10;

const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-dates");

const state = {
  purchases: [],
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  page: 1,
};

const receiptViewer = createReceiptViewer();

// กราฟน้ำหนักรายเดือน
const weightChart = createMonthlyBarChart(byId("weight-chart-empty"), byId("weight-chart"), {
  valueKey: "rawWeightKg",
  yAxisLabel: "น้ำหนักน้ำยางสด (กก.)",
  unit: "กก.",
  seriesName: "น้ำหนักน้ำยางสด",
});

// การขายที่อยู่ในช่วงวันที่ที่เลือก
function filteredPurchases() {
  return state.purchases.filter((purchase) => {
    const day = purchase.recordDate.slice(0, 10);
    if (state.dateFrom && day < state.dateFrom) return false;
    if (state.dateTo && day > state.dateTo) return false;
    return true;
  });
}

// สร้างแถวตาราง
function createRow(purchase) {
  const row = cloneTemplate("sales-row-template");
  setSlot(row, "date", formatDateUtc(purchase.recordDate));
  setSlot(row, "rawWeightKg", formatNumber(purchase.rawWeightKg));
  setSlot(row, "dryWeightKg", formatNumber(purchase.dryWeightKg));
  setSlot(row, "marketPrice", formatNumber(purchase.marketPrice));
  setSlot(row, "deliveredByName", purchase.deliveredByName);
  setSlot(row, "totalAmount", formatNumber(purchase.totalAmount));

  // ส่วนที่หักจ่ายลูกจ้าง (ไม่มี = "-")
  const hasEmployeePayout = purchase.employeePayout > 0;
  const employeePayout = row.querySelector('[data-slot="employeePayout"]');
  employeePayout.hidden = !hasEmployeePayout;
  employeePayout.textContent = hasEmployeePayout ? `-${formatNumber(purchase.employeePayout)}` : "";
  row.querySelector('[data-slot="no-employee-payout"]').hidden = hasEmployeePayout;

  setSlot(row, "ownerPayout", formatNumber(purchase.ownerPayout));
  action(row, "receipt").addEventListener("click", () => receiptViewer.open(purchase));
  return row;
}

// วาดกราฟ + ตาราง
function render() {
  const filtered = filteredPurchases();

  weightChart.render(
    groupByMonth(filtered, (p) => p.recordDate, (p) => p.rawWeightKg, "rawWeightKg")
  );

  const pagePurchases = paginate(filtered, state.page, PAGE_SIZE);
  byId("sales-empty").hidden = pagePurchases.length !== 0;
  byId("sales-table").hidden = pagePurchases.length === 0;
  byId("sales-rows").replaceChildren(...pagePurchases.map(createRow));
  renderPagination(byId("sales-pagination"), {
    page: state.page,
    totalPages: totalPagesOf(filtered, PAGE_SIZE),
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
  const data = await loadMemberPortalData("sales");
  renderMemberTopbar(data.portal, data.notifications);
  state.purchases = data.purchases;
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false; // แสดงก่อนวาดกราฟ เพื่อให้กราฟวัดขนาดได้
  render();
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

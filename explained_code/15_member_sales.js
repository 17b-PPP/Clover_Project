// =============================================================================
// ไฟล์: explained_code/15_พอร์ทัลสมาชิก_ประวัติการขาย_sales.js
// หน้าที่: ควบคุมการทำงานของหน้า "ประวัติการขาย" ของสมาชิก (Member Latex Sales History)
// ไฟล์ HTML ที่คู่กัน: pages/member-sales.html
// เส้นทาง URL: /member/sales
// ความสำคัญทางธุรกิจ:
//   สมาชิกสามารถตรวจสอบประวัติการส่งน้ำยางของสวนตนเองย้อนหลังได้ทุกบิล
//   ดูกราฟผลผลิตน้ำยางรายเดือน และสามารถกดเปิดดู/พิมพ์สำเนาใบเสร็จรับเงินได้
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../public/js/core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateUtc, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../public/js/components/member-sidebar.js";
import { renderMemberTopbar } from "../public/js/components/member-topbar.js";
import { createReceiptViewer } from "../public/js/components/receipt-viewer.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";
import { createMonthlyBarChart, groupByMonth } from "../public/js/charts/monthly-bar-chart.js";

initMemberSidebar();

const PAGE_SIZE = 10;
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");

const state = {
  purchases: [],               // รายการขายน้ำยางทั้งหมด
  dateFrom: DEFAULT_DATE_FROM, // วันที่เริ่มต้น
  dateTo: todayBangkok(),      // วันที่สิ้นสุด
  page: 1,
};

// คอมโพเนนต์เปิดดูใบเสร็จรับซื้อน้ำยาง (Receipt Modal)
const receiptViewer = createReceiptViewer();

// กราฟแท่งแสดงน้ำหนักน้ำยางสดในแต่ละเดือน (กก.)
const weightChart = createMonthlyBarChart(byId("weight-chart-empty"), byId("weight-chart"), {
  valueKey: "rawWeightKg",
  yAxisLabel: "น้ำหนักน้ำยางสด (กก.)",
  unit: "กก.",
  seriesName: "น้ำหนักน้ำยางสด",
});

/**
 * กรองรายการขายตามช่วงวันที่ที่เลือก
 */
function filteredPurchases() {
  return state.purchases.filter((purchase) => {
    const day = purchase.recordDate.slice(0, 10);
    if (state.dateFrom && day < state.dateFrom) return false;
    if (state.dateTo && day > state.dateTo) return false;
    return true;
  });
}

/**
 * สร้างแถวตาราง 1 แถว พร้อมปุ่มกดดูใบเสร็จ
 */
function createRow(purchase) {
  const row = cloneTemplate("sales-row-template");
  setSlot(row, "date", formatDateUtc(purchase.recordDate));
  setSlot(row, "rawWeightKg", formatNumber(purchase.rawWeightKg));
  setSlot(row, "dryWeightKg", formatNumber(purchase.dryWeightKg));
  setSlot(row, "marketPrice", formatNumber(purchase.marketPrice));
  setSlot(row, "deliveredByName", purchase.deliveredByName);
  setSlot(row, "totalAmount", formatNumber(purchase.totalAmount));

  // แสดงยอดหักจ่ายลูกจ้าง (ถ้ามี)
  const hasEmployeePayout = purchase.employeePayout > 0;
  const employeePayout = row.querySelector('[data-slot="employeePayout"]');
  employeePayout.hidden = !hasEmployeePayout;
  employeePayout.textContent = hasEmployeePayout ? `-${formatNumber(purchase.employeePayout)}` : "";
  row.querySelector('[data-slot="no-employee-payout"]').hidden = hasEmployeePayout;

  // ยอดสุทธิที่เข้ากระเป๋าสมาชิก (ownerPayout)
  setSlot(row, "ownerPayout", formatNumber(purchase.ownerPayout));

  // เมื่อคลิกปุ่ม "ดูใบเสร็จ"
  action(row, "receipt").addEventListener("click", () => receiptViewer.open(purchase));
  return row;
}

function render() {
  const filtered = filteredPurchases();

  // จัดกลุ่มข้อมูลและวาดกราฟน้ำหนักน้ำยางรายเดือน
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
}

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadMemberPortalData("sales");
  renderMemberTopbar(data.profile);
  state.purchases = data.purchases ?? [];
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

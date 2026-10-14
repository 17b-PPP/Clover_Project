// =============================================================================
// ไฟล์: explained_code/10_สรุปผลประกอบการ_purchase_summary.js
// หน้าที่: ควบคุมการทำงานของหน้า "ผลประกอบการการรับซื้อน้ำยางสด" (Purchase Performance & Analytics)
// ไฟล์ HTML ที่คู่กัน: pages/purchase-summary.html
// เส้นทาง URL: /performance/purchase-summary
// ความสำคัญทางธุรกิจ:
//   หน้ารายงานสรุปยอดภาพรวมเชิงบริหาร จัดการตัวกรองวันที่/สมาชิก
//   คำนวณการ์ดสรุป 8 ใบ, วาดกราฟแนวโน้ม และส่งออกเป็นรายงานไฟล์ Excel (.xlsx)
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import {
  DEFAULT_DATE_FROM,
  formatCurrency,
  formatDateUtc,
  formatNumber,
  formatTimeThai,
  todayBangkok,
} from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createCombobox } from "../public/js/components/combobox.js";
import { createReceiptViewer } from "../public/js/components/receipt-viewer.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";
import { createPurchaseTrendChart } from "../public/js/charts/purchase-trend-chart.js";

initSidebar();

const PAGE_SIZE = 10;
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-filters");

const state = {
  rows: [],                    // รายการรับซื้อทั้งหมดที่โหลดมาจากเซิร์ฟเวอร์
  withdrawals: [],             // รายการเบิกเงินทั้งหมดในช่วงเวลา
  dateFrom: DEFAULT_DATE_FROM, // วันที่เริ่มต้น (ย้อนหลัง 30 วัน)
  dateTo: todayBangkok(),      // วันที่สิ้นสุด (วันนี้)
  search: "",                  // รหัสสมาชิกที่เลือกกรอง
  page: 1,
};

// กราฟแนวโน้มการรับซื้อน้ำยาง (React + Recharts)
const trendChart = createPurchaseTrendChart(byId("trend-empty"), byId("trend-chart"));
const receiptViewer = createReceiptViewer();

/**
 * กรองรายการรับซื้อตามช่วงวันที่และสมาชิกที่เลือก
 */
function filteredRows() {
  const term = state.search.trim().toLowerCase();
  return state.rows.filter((row) => {
    const day = row.recordDate.slice(0, 10);
    const matchesFrom = !state.dateFrom || day >= state.dateFrom;
    const matchesTo = !state.dateTo || day <= state.dateTo;
    const matchesSearch =
      !term ||
      row.memberName.toLowerCase().includes(term) ||
      row.memberCode.toLowerCase().includes(term);
    return matchesFrom && matchesTo && matchesSearch;
  });
}

/**
 * [จุดสำคัญ] การคำนวณตัวเลขสรุปบนการ์ดทั้ง 8 ใบ (Client-side Computation)
 */
function computeSummary(filtered, withdrawals) {
  const totalRawWeightKg = filtered.reduce((sum, r) => sum + r.rawWeightKg, 0);
  const totalDryWeightKg = filtered.reduce((sum, r) => sum + r.dryWeightKg, 0);
  const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalEmployeePayout = filtered.reduce((sum, r) => sum + r.employeePayout, 0);
  const totalOwnerPayout = filtered.reduce((sum, r) => sum + r.ownerPayout, 0);
  const totalWithdrawalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const transactionCount = filtered.length;
  // ยอดเงินสุทธิสะสมในระบบ = ยอดเข้ากระเป๋าสมาชิก - ยอดที่สมาชิกเบิกออกไป
  const netBalance = totalOwnerPayout - totalWithdrawalAmount;

  return {
    totalRawWeightKg,
    totalDryWeightKg,
    totalAmount,
    totalEmployeePayout,
    totalOwnerPayout,
    totalWithdrawalAmount,
    transactionCount,
    netBalance,
  };
}

/**
 * อัปเดตลิงก์ดาวน์โหลดไฟล์ Excel ตามช่วงวันที่ที่กำลังกรองอยู่
 */
function updateExportLink() {
  const params = new URLSearchParams();
  if (state.dateFrom) params.set("from", state.dateFrom);
  if (state.dateTo) params.set("to", state.dateTo);
  const exportBtn = byId("export-excel");
  if (exportBtn) {
    exportBtn.href = `/api/performance/purchase-summary/export?${params.toString()}`;
  }
}

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("purchase-summary");
  state.rows = data.rows ?? [];
  state.withdrawals = data.withdrawals ?? [];
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

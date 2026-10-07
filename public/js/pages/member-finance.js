// =============================================================================
// public/js/pages/member-finance.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ประวัติทางการเงิน" ของสมาชิก (pages/member-finance.html)
//
//   - การ์ดกระเป๋าเงิน (แบบกะทัดรัด) + ยอดที่เบิกไปแล้วทั้งหมด
//   - ตัวกรอง: ประเภทรายการ (ทั้งหมด/ขายน้ำยาง/เบิกเงิน/ปันผล) + ช่วงวันที่
//   - กราฟรายได้จากการขายรายเดือน (ซ่อนเมื่อกรองเฉพาะเบิกเงิน/ปันผล)
//   - ตารางรายการ แบ่งหน้าละ 10 รายการ
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateUtc, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../components/member-sidebar.js";
import { renderMemberTopbar } from "../components/member-topbar.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";
import { createMonthlyBarChart, groupByMonth } from "../charts/monthly-bar-chart.js";

initMemberSidebar();

const PAGE_SIZE = 10;

const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-filters");
const typeButtons = [...byId("type-filter").querySelectorAll("[data-type]")];

const state = {
  entries: [],
  typeFilter: "ALL",
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  page: 1,
};

// กราฟรายได้รายเดือน
const incomeChart = createMonthlyBarChart(byId("income-chart-empty"), byId("income-chart"), {
  valueKey: "income",
  yAxisLabel: "รายได้จากการขาย (บาท)",
  unit: "บาท",
  seriesName: "รายได้จากการขายน้ำยาง",
});

// -----------------------------------------------------------------------------
// ตาราง
// -----------------------------------------------------------------------------

// ป้ายประเภทรายการ
const BADGE_SLOT = {
  PURCHASE: "badge-purchase",
  DIVIDEND: "badge-dividend",
  WITHDRAWAL: "badge-withdrawal",
};

// สร้างบรรทัดรายละเอียดตัวเล็ก 1 บรรทัด
function detailLine(text, danger = false) {
  const line = cloneTemplate("detail-line-template");
  if (danger) line.className = "detail-line detail-line--danger";
  line.textContent = text;
  return line;
}

// บรรทัดรายละเอียดตามประเภทรายการ (บอกที่มาของจำนวนเงิน)
function detailLines(entry) {
  if (entry.type === "PURCHASE") {
    const lines = [detailLine(`ขายน้ำยางสด ยอดรวม ${formatNumber(entry.totalAmount ?? 0)} บาท`)];
    if (entry.deliveredByName) {
      lines.push(
        detailLine(
          `แบ่งจ่ายให้ลูกจ้าง ${entry.deliveredByName} ${formatNumber(entry.employeePayout ?? 0)} บาท`,
          true
        )
      );
    }
    return lines;
  }
  if (entry.type === "DIVIDEND") {
    return [
      detailLine(
        `เงินปันผลประจำปี ${entry.buddhistYear}${entry.periodLabel ? ` (${entry.periodLabel})` : ""}`
      ),
      detailLine(`อัตรา ${formatNumber(entry.rate ?? 0)} บาท/กก.`),
    ];
  }
  return [
    detailLine(`เบิกเงิน ${formatNumber(Math.abs(entry.amount))} บาท`),
    detailLine(`คงเหลือหลังเบิก ${formatNumber(entry.balanceAfter ?? 0)} บาท`),
  ];
}

function createRow(entry) {
  const row = cloneTemplate("finance-row-template");
  setSlot(row, "date", formatDateUtc(entry.date));
  for (const [type, slotName] of Object.entries(BADGE_SLOT)) {
    row.querySelector(`[data-slot="${slotName}"]`).hidden = entry.type !== type;
  }
  setSlot(row, "code", entry.code);
  row.querySelector('[data-slot="details"]').replaceChildren(...detailLines(entry));

  // จำนวนเงิน: รับ = สีเขียว "+", จ่าย = สีแดง "-"
  const isIncome = entry.amount >= 0;
  const amount = row.querySelector('[data-slot="amount"]');
  amount.className = isIncome ? "num-income" : "num-outflow";
  amount.textContent = `${isIncome ? "+" : "-"}${formatNumber(Math.abs(entry.amount))}`;
  return row;
}

// -----------------------------------------------------------------------------
// วาดหน้า
// -----------------------------------------------------------------------------
function filteredEntries() {
  return state.entries.filter((entry) => {
    if (state.typeFilter !== "ALL" && entry.type !== state.typeFilter) return false;
    if (state.dateFrom && entry.date < state.dateFrom) return false;
    if (state.dateTo && entry.date > state.dateTo) return false;
    return true;
  });
}

function render() {
  const filtered = filteredEntries();

  // ปุ่มประเภทรายการ
  for (const button of typeButtons) {
    const active = button.dataset.type === state.typeFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  // ปุ่มล้างใช้ได้เมื่อเลือกประเภทอื่น หรือช่วงวันที่ไม่ใช่ค่าเริ่มต้น
  resetButton.disabled = state.typeFilter === "ALL" && state.dateFrom === DEFAULT_DATE_FROM && state.dateTo === todayBangkok();

  // กราฟมีแต่รายได้จากการขาย จึงไม่แสดงเมื่อกรองเฉพาะเบิกเงิน/ปันผล
  const showChart = state.typeFilter === "ALL" || state.typeFilter === "PURCHASE";
  const chartSection = byId("income-chart-section");
  if (showChart) {
    chartSection.hidden = false;
    const sales = filtered.filter((entry) => entry.type === "PURCHASE");
    incomeChart.render(
      groupByMonth(sales, (entry) => entry.date, (entry) => entry.amount, "income")
    );
  } else {
    incomeChart.render([]); // ถอดกราฟออก
    chartSection.hidden = true;
  }

  // ตาราง
  const pageEntries = paginate(filtered, state.page, PAGE_SIZE);
  byId("finance-empty").hidden = pageEntries.length !== 0;
  byId("finance-table").hidden = pageEntries.length === 0;
  byId("finance-rows").replaceChildren(...pageEntries.map(createRow));
  renderPagination(byId("finance-pagination"), {
    page: state.page,
    totalPages: totalPagesOf(filtered, PAGE_SIZE),
    onPageChange: (page) => {
      state.page = page;
      render();
    },
  });
}

// เปลี่ยนตัวกรอง → ถ้าค่าเปลี่ยนจริง ให้กลับไปหน้า 1
function setFilter(changes) {
  const changed = Object.entries(changes).some(([key, value]) => state[key] !== value);
  Object.assign(state, changes);
  if (changed) state.page = 1;
  render();
}

for (const button of typeButtons) {
  button.addEventListener("click", () => setFilter({ typeFilter: button.dataset.type }));
}
dateFromInput.addEventListener("input", () => setFilter({ dateFrom: dateFromInput.value }));
dateToInput.addEventListener("input", () => setFilter({ dateTo: dateToInput.value }));
// ปุ่มล้าง: กลับไปประเภท "ทั้งหมด" และช่วงวันที่เริ่มต้น
resetButton.addEventListener("click", () => {
  const defaults = { dateFrom: DEFAULT_DATE_FROM, dateTo: todayBangkok() };
  dateFromInput.value = defaults.dateFrom;
  dateToInput.value = defaults.dateTo;
  setFilter({ typeFilter: "ALL", ...defaults });
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateFromInput.value = state.dateFrom;
dateToInput.value = state.dateTo;

try {
  const data = await loadMemberPortalData("finance");
  renderMemberTopbar(data.portal, data.notifications);

  // การ์ดกระเป๋าเงินแบบกะทัดรัด
  byId("wallet-card").classList.add("wallet-card--compact");
  byId("wallet-balance").textContent = formatNumber(data.portal.profile.walletBalance);
  byId("wallet-monthly").textContent = formatNumber(data.walletSummary.monthlyEarnings);

  // ยอดเบิกรวมทุกรายการ (ไม่ขึ้นกับตัวกรอง)
  const totalWithdrawn = data.entries
    .filter((entry) => entry.type === "WITHDRAWAL")
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  byId("total-withdrawn").textContent = formatNumber(totalWithdrawn);

  state.entries = data.entries;
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false; // แสดงก่อนวาดกราฟ เพื่อให้กราฟวัดขนาดได้
  render();
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

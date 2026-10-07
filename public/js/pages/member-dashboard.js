// =============================================================================
// public/js/pages/member-dashboard.js
// -----------------------------------------------------------------------------
// การทำงานของหน้าหลักสมาชิก (pages/member-dashboard.html)
//
//   - การ์ดกระเป๋าเงิน: ยอดเงินสะสม + เงินที่ได้ในเดือนนี้
//   - การ์ดลูกจ้าง: ลูกจ้างที่มีสัญญาส่งน้ำยางแทน พร้อมสัดส่วนรายได้
//   - ภาพรวมน้ำยาง / การเงิน: คำนวณจากประวัติการเงิน กรองตามช่วงวันที่ได้
//   - การ์ดปันผล: ยอดปันผลสะสม + ปันผลของปีที่เลือก
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../core/page-data.js";
import { DEFAULT_DATE_FROM, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../components/member-sidebar.js";
import { renderMemberTopbar } from "../components/member-topbar.js";

initMemberSidebar();

const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-dates");
const yearSelect = byId("dividend-year");

const state = {
  entries: [], // ประวัติการเงินทั้งหมด (ขาย / เบิก / ปันผล)
  dividendBalance: 0,
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  selectedYear: null, // ปีที่เลือกในการ์ดปันผล
};

// -----------------------------------------------------------------------------
// การ์ดลูกจ้าง
// -----------------------------------------------------------------------------
function renderEmployees(employees) {
  byId("employee-empty").hidden = employees.length !== 0;
  const list = byId("employee-list");
  list.hidden = employees.length === 0;
  list.replaceChildren(
    ...employees.map((employee) => {
      const item = cloneTemplate("employee-item-template");
      setSlot(item, "name", `${employee.firstName} ${employee.lastName}`);
      setSlot(item, "code", employee.employeeCode);
      setSlot(item, "phone", employee.phone);
      setSlot(item, "shares", `${employee.memberShare}% / ${employee.employeeShare}%`);
      return item;
    })
  );
}

// -----------------------------------------------------------------------------
// ภาพรวมน้ำยาง / การเงิน (ตามช่วงวันที่)
// -----------------------------------------------------------------------------
function filteredEntries() {
  return state.entries.filter((entry) => {
    if (state.dateFrom && entry.date < state.dateFrom) return false;
    if (state.dateTo && entry.date > state.dateTo) return false;
    return true;
  });
}

// รวมตัวเลขจากรายการที่ผ่านตัวกรอง
function computeTotals(entries) {
  let rawWeightKg = 0;
  let dryWeightKg = 0;
  let totalAmount = 0;
  let myAmount = 0; // ยอดที่เข้ากระเป๋าเงินของสมาชิกเอง (ไม่รวมส่วนของลูกจ้าง)
  let withdrawnAmount = 0;
  let saleCount = 0;
  const salesByEmployee = new Map(); // ยอดเงินที่ลูกจ้างแต่ละคนได้รับ

  for (const entry of entries) {
    if (entry.type === "PURCHASE") {
      saleCount += 1;
      rawWeightKg += entry.rawWeightKg ?? 0;
      dryWeightKg += ((entry.rawWeightKg ?? 0) * (entry.dryPercentage ?? 0)) / 100;
      totalAmount += entry.totalAmount ?? 0;
      myAmount += entry.amount;
      if (entry.deliveredByName && entry.employeePayout) {
        salesByEmployee.set(
          entry.deliveredByName,
          (salesByEmployee.get(entry.deliveredByName) ?? 0) + entry.employeePayout
        );
      }
    } else if (entry.type === "WITHDRAWAL") {
      withdrawnAmount += Math.abs(entry.amount);
    }
  }

  const employeeSales = [...salesByEmployee.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { rawWeightKg, dryWeightKg, totalAmount, myAmount, withdrawnAmount, saleCount, employeeSales };
}

function renderOverview() {
  const totals = computeTotals(filteredEntries());

  byId("total-raw-weight").textContent = formatNumber(totals.rawWeightKg);
  byId("total-dry-weight").textContent = `${formatNumber(totals.dryWeightKg)} กก.`;
  byId("sale-count").textContent = `${formatNumber(totals.saleCount, 0)} ครั้ง`;

  byId("total-sales").textContent = formatNumber(totals.totalAmount);
  byId("my-sales").textContent = formatNumber(totals.myAmount);
  byId("total-withdrawn").textContent = formatNumber(totals.withdrawnAmount);

  // ยอดเงินลูกจ้าง: รวมทั้งหมด + แยกรายคน (ไม่มี → "—")
  const employeeSalesElement = byId("employee-sales");
  if (totals.employeeSales.length > 0) {
    const block = cloneTemplate("employee-sales-template");
    setSlot(
      block,
      "total",
      formatNumber(totals.employeeSales.reduce((sum, sale) => sum + sale.amount, 0))
    );
    for (const sale of totals.employeeSales) {
      const row = cloneTemplate("employee-sales-row-template");
      setSlot(row, "name", sale.name);
      setSlot(row, "amount", formatNumber(sale.amount));
      block.append(row);
    }
    employeeSalesElement.replaceChildren(block);
  } else {
    employeeSalesElement.textContent = "—";
  }

  // ปุ่มล้างใช้ได้เมื่อช่วงวันที่ไม่ใช่ค่าเริ่มต้น
  resetButton.disabled = state.dateFrom === DEFAULT_DATE_FROM && state.dateTo === todayBangkok();
}

// -----------------------------------------------------------------------------
// การ์ดปันผล (ใช้ประวัติทั้งหมด ไม่ขึ้นกับตัวกรองวันที่)
// -----------------------------------------------------------------------------

// รวมปันผลตามปี พ.ศ. { amount, periodLabel }
function dividendsByYear() {
  const map = new Map();
  for (const entry of state.entries) {
    if (entry.type !== "DIVIDEND" || entry.buddhistYear == null) continue;
    const existing = map.get(entry.buddhistYear);
    if (existing) {
      existing.amount += entry.amount;
    } else {
      map.set(entry.buddhistYear, {
        amount: entry.amount,
        periodLabel: entry.periodLabel ?? null,
      });
    }
  }
  return map;
}

function renderDividendCard() {
  const byYear = dividendsByYear();
  // มีปีปัจจุบันให้เลือกเสมอ แม้ยังไม่เคยได้ปันผล
  const currentBuddhistYear = new Date().getUTCFullYear() + 543;
  const years = [...new Set([currentBuddhistYear, ...byYear.keys()])].sort((a, b) => b - a);
  const activeYear = years.includes(state.selectedYear) ? state.selectedYear : years[0];
  const summary = byYear.get(activeYear);

  byId("dividend-balance").textContent = formatNumber(state.dividendBalance);

  yearSelect.replaceChildren(
    ...years.map((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      return option;
    })
  );
  yearSelect.value = String(activeYear);

  byId("dividend-year-amount").textContent = formatNumber(summary?.amount ?? 0);
  const period = byId("dividend-year-period");
  period.hidden = !summary?.periodLabel;
  period.textContent = summary?.periodLabel ?? "";
}

// -----------------------------------------------------------------------------
// ตัวกรองวันที่
// -----------------------------------------------------------------------------
dateFromInput.addEventListener("input", () => {
  state.dateFrom = dateFromInput.value;
  renderOverview();
});
dateToInput.addEventListener("input", () => {
  state.dateTo = dateToInput.value;
  renderOverview();
});
// ปุ่มล้าง: กลับไปช่วงวันที่เริ่มต้น
resetButton.addEventListener("click", () => {
  state.dateFrom = DEFAULT_DATE_FROM;
  state.dateTo = todayBangkok();
  dateFromInput.value = state.dateFrom;
  dateToInput.value = state.dateTo;
  renderOverview();
});

yearSelect.addEventListener("change", () => {
  state.selectedYear = Number(yearSelect.value);
  renderDividendCard();
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateFromInput.value = state.dateFrom;
dateToInput.value = state.dateTo;

try {
  const data = await loadMemberPortalData("dashboard");
  renderMemberTopbar(data.portal, data.notifications);

  byId("wallet-balance").textContent = formatNumber(data.portal.profile.walletBalance);
  byId("wallet-monthly").textContent = formatNumber(data.walletSummary.monthlyEarnings);
  renderEmployees(data.employees);

  state.entries = data.entries;
  state.dividendBalance = data.portal.profile.dividendBalance;
  renderOverview();
  renderDividendCard();

  byId("page-loading").hidden = true;
  byId("page-content").hidden = false;
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

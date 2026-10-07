// =============================================================================
// public/js/pages/purchase-summary.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ผลประกอบการการรับซื้อน้ำยางสด" (pages/purchase-summary.html)
//
// โหลดรายการรับซื้อ + รายการเบิกเงินทั้งหมดครั้งเดียว แล้วคำนวณทุกอย่างในหน้าเว็บ
// ตามตัวกรอง (ช่วงวันที่ และสมาชิก):
//   - การ์ดสรุป 8 ใบ
//   - กราฟแนวโน้มรายวัน (น้ำหนักรวม + ราคา)
//   - ตารางรายการรับซื้อ แบ่งหน้าละ 10 รายการ พร้อมปุ่มดูใบเสร็จ
//   - ลิงก์ดาวน์โหลด Excel ใช้ช่วงวันที่เดียวกับตัวกรอง
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import {
  DEFAULT_DATE_FROM,
  formatCurrency,
  formatDateUtc,
  formatNumber,
  formatTimeThai,
  todayBangkok,
} from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createCombobox } from "../components/combobox.js";
import { createReceiptViewer } from "../components/receipt-viewer.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";
import { createPurchaseTrendChart } from "../charts/purchase-trend-chart.js";

initSidebar();

const PAGE_SIZE = 10;

const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetButton = byId("reset-filters");

const state = {
  rows: [], // รายการรับซื้อทั้งหมด
  withdrawals: [], // รายการเบิกเงินทั้งหมด
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  search: "", // รหัสสมาชิกที่เลือกในช่องค้นหา
  page: 1,
};

const trendChart = createPurchaseTrendChart(byId("trend-empty"), byId("trend-chart"));
const receiptViewer = createReceiptViewer();

// ช่องค้นหาสมาชิก (เลือกแล้วจะกรองเฉพาะสมาชิกคนนั้น)
const memberCombobox = createCombobox(byId("member-search-field"), {
  emptyMessage: "ไม่พบสมาชิกที่ตรงกัน",
  onChange: (value) => setFilter({ search: value }),
});

// -----------------------------------------------------------------------------
// การคำนวณ
// -----------------------------------------------------------------------------

// ตัวเลือกสมาชิก: รหัสไม่ซ้ำจากรายการรับซื้อ เรียงตามรหัส
function memberOptions() {
  const byCode = new Map();
  for (const row of state.rows) {
    if (!byCode.has(row.memberCode)) byCode.set(row.memberCode, row.memberName);
  }
  return [...byCode.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, name]) => ({ value: code, label: `${code} · ${name}` }));
}

// รายการรับซื้อที่อยู่ในช่วงวันที่ และตรงกับสมาชิกที่ค้นหา
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

// รายการเบิกเงินในช่วงวันที่เดียวกัน (ใช้วันที่ทำรายการ)
function withdrawalsInRange() {
  return state.withdrawals.filter((w) => {
    const day = w.createdAt.slice(0, 10);
    const matchesFrom = !state.dateFrom || day >= state.dateFrom;
    const matchesTo = !state.dateTo || day <= state.dateTo;
    return matchesFrom && matchesTo;
  });
}

// ตัวเลขสรุปของการ์ดทั้ง 8 ใบ
function computeSummary(filtered, withdrawals) {
  const totalRawWeightKg = filtered.reduce((sum, r) => sum + r.rawWeightKg, 0);
  const totalDryWeightKg = filtered.reduce((sum, r) => sum + r.dryWeightKg, 0);
  const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  // ราคาเฉลี่ยรายวัน: ใช้ราคาของแต่ละวันครั้งเดียว แล้วเฉลี่ย
  const priceByDay = new Map();
  for (const row of filtered) {
    const day = row.recordDate.slice(0, 10);
    if (!priceByDay.has(day)) priceByDay.set(day, row.marketPrice);
  }
  const dayPrices = [...priceByDay.values()];
  const avgDailyPrice =
    dayPrices.length > 0 ? dayPrices.reduce((sum, p) => sum + p, 0) / dayPrices.length : 0;

  return {
    totalRawWeightKg,
    totalDryWeightKg,
    totalAmount,
    totalWithdrawn,
    netAmount: totalAmount - totalWithdrawn,
    avgDailyPrice,
    billCount: filtered.length,
    memberCount: new Set(filtered.map((r) => r.memberCode)).size,
  };
}

// ข้อมูลกราฟรายวัน: รวมน้ำหนักของแต่ละวัน + ราคาของวันนั้น (เรียงวันจากเก่าไปใหม่)
function dailyTrend(filtered) {
  const byDay = new Map();
  for (const row of filtered) {
    const day = row.recordDate.slice(0, 10);
    const existing = byDay.get(day);
    if (existing) {
      existing.totalRawWeightKg += row.rawWeightKg;
    } else {
      byDay.set(day, { day, totalRawWeightKg: row.rawWeightKg, price: row.marketPrice });
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// -----------------------------------------------------------------------------
// วาดหน้า
// -----------------------------------------------------------------------------
function createRow(row) {
  const tr = cloneTemplate("recent-row-template");
  setSlot(tr, "date", formatDateUtc(row.recordDate));
  setSlot(tr, "time", formatTimeThai(row.createdAt));
  setSlot(tr, "memberName", row.memberName);
  setSlot(tr, "memberCode", row.memberCode);
  setSlot(tr, "rawWeightKg", formatNumber(row.rawWeightKg));
  setSlot(tr, "dryPercentage", formatNumber(row.dryPercentage));
  setSlot(tr, "marketPrice", formatNumber(row.marketPrice));
  setSlot(tr, "totalAmount", formatCurrency(row.totalAmount));
  action(tr, "receipt").addEventListener("click", () => receiptViewer.open(row));
  return tr;
}

function render() {
  const filtered = filteredRows();
  const summary = computeSummary(filtered, withdrawalsInRange());

  // การ์ดสรุป
  byId("stat-raw-weight").textContent = `${formatNumber(summary.totalRawWeightKg)} กก.`;
  byId("stat-dry-weight").textContent = `${formatNumber(summary.totalDryWeightKg)} กก.`;
  byId("stat-dry-weight-hint").textContent = state.search
    ? `น้ำหนักยางแห้งของ "${state.search}"`
    : "น้ำหนักยางแห้งรวมทั้งช่วง";
  byId("stat-avg-price").textContent = `${formatNumber(summary.avgDailyPrice)} บาท/กก.`;
  byId("stat-bill-count").textContent = formatNumber(summary.billCount, 0);
  byId("stat-member-count").textContent = formatNumber(summary.memberCount, 0);
  byId("stat-total-amount").textContent = formatCurrency(summary.totalAmount);
  byId("stat-withdrawn").textContent = formatCurrency(summary.totalWithdrawn);
  byId("stat-net-amount").textContent = formatCurrency(summary.netAmount);

  // กราฟ
  trendChart.render(dailyTrend(filtered));

  // ตาราง
  const pageRows = paginate(filtered, state.page, PAGE_SIZE);
  byId("recent-empty").hidden = pageRows.length !== 0;
  byId("recent-table").hidden = pageRows.length === 0;
  byId("recent-rows").replaceChildren(...pageRows.map(createRow));
  renderPagination(byId("recent-pagination"), {
    page: state.page,
    totalPages: totalPagesOf(filtered, PAGE_SIZE),
    onPageChange: (page) => {
      state.page = page;
      render();
    },
  });

  // ลิงก์ Excel ตามช่วงวันที่
  const exportParams = new URLSearchParams();
  if (state.dateFrom) exportParams.set("from", state.dateFrom);
  if (state.dateTo) exportParams.set("to", state.dateTo);
  byId("export-link").href = `/api/performance/purchase-summary/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  // ปุ่มล้างใช้ได้เมื่อช่วงวันที่ไม่ใช่ค่าเริ่มต้น หรือมีการเลือกสมาชิก
  resetButton.disabled = state.dateFrom === DEFAULT_DATE_FROM && state.dateTo === todayBangkok() && !state.search;
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
// ปุ่มล้าง: กลับไปช่วงวันที่เริ่มต้น และล้างการเลือกสมาชิก
resetButton.addEventListener("click", () => {
  const defaults = { dateFrom: DEFAULT_DATE_FROM, dateTo: todayBangkok() };
  dateFromInput.value = defaults.dateFrom;
  dateToInput.value = defaults.dateTo;
  memberCombobox.setValue("");
  setFilter({ ...defaults, search: "" });
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateFromInput.value = state.dateFrom;
dateToInput.value = state.dateTo;

try {
  const data = await loadPageData("purchase-summary");
  state.rows = data.rows;
  state.withdrawals = data.withdrawals;
  memberCombobox.setOptions(memberOptions());
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false; // ต้องแสดงก่อนวาดกราฟ เพื่อให้กราฟวัดขนาดได้
  render();
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

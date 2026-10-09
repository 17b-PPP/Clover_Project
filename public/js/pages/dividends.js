// =============================================================================
// public/js/pages/dividends.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการคำนวณเงินปันผล" (pages/dividends.html)
//
// ขั้นตอนการใช้งาน:
//   1. เลือกปี พ.ศ. และกรอกอัตราปันผล (บาท/กก.) แล้วกด "ตกลง"
//      → ตารางแสดงน้ำหนักยางแห้งรวมและเงินปันผลของสมาชิกทุกคน (คำนวณในหน้าเว็บ)
//   2. กด "จ่ายปันผล" → ยืนยัน → เซิร์ฟเวอร์คำนวณซ้ำและบวกเงินเข้ายอดสะสมของสมาชิก
//   3. หลังจ่ายสำเร็จ โหลดข้อมูลใหม่ (ประวัติการจ่าย/ปีที่จ่ายแล้ว) โดยไม่ล้างค่าที่เลือกไว้
//   ปีที่เคยจ่ายแล้ว ยังคำนวณดูได้ แต่กดจ่ายซ้ำไม่ได้
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { formatCurrency, formatDateTimeThai, formatNumber } from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createModal } from "../components/modal.js";
import { createConfirmDialog } from "../components/confirm-dialog.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;
// สหกรณ์จ่ายปันผลตามรอบบัญชีเดิมทุกปี จึงแสดงเป็นข้อความคงที่
const DIVIDEND_PERIOD_LABEL = "พฤษภาคม - มีนาคม";

const yearSelect = byId("year-select");
const rateInput = byId("rate-input");
const calcSubmitBtn = byId("calc-submit-btn");
const lockBanner = byId("dividend-lock-banner");
const page = byId("page-content");

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  data: null, // { members, purchases, paidYears, payments } จากเซิร์ฟเวอร์
  year: null, // ปี พ.ศ. ที่เลือก
  appliedPeriodLabel: "", // ช่วงเวลา ณ ตอนกด "ตกลง"
  appliedRate: null, // อัตราที่ใช้คำนวณ (null = ยังไม่กด "ตกลง")
  error: null,
  page: 1,
  paid: false, // จ่ายสำเร็จแล้วในรอบนี้
  payError: null,
  selectedPayout: null, // ประวัติที่เปิดดูรายละเอียด
};

// ปีที่เลือกได้: ปีปัจจุบัน + ทุกปีที่มีการรับซื้อหรือจ่ายเงินปันผลในอดีต (ไม่เกินปีปัจจุบันจริง)
function availableYears() {
  const currentBuddhistYear = new Date().getUTCFullYear() + 543;
  const set = new Set([currentBuddhistYear]);
  for (const purchase of state.data.purchases) {
    if (purchase.buddhistYear <= currentBuddhistYear) set.add(purchase.buddhistYear);
  }
  for (const year of state.data.paidYears) {
    if (year <= currentBuddhistYear) set.add(year);
  }
  return [...set].sort((a, b) => b - a);
}

// เลือกปีเริ่มต้น: ใช้ปีปัจจุบันเสมอ (เช่น ในปี 2569 จะเลือก 2569 และเมื่อถึงปี 2570 ระบบจะสลับเป็นปี 2570 ให้อัตโนมัติ)
function defaultYear(years) {
  const currentBuddhistYear = new Date().getUTCFullYear() + 543;
  if (years.includes(currentBuddhistYear)) return currentBuddhistYear;
  return years[0];
}

// ปีที่เลือกเคยจ่ายปันผลไปแล้วหรือไม่
const yearAlreadyPaid = () => state.data.paidYears.includes(state.year);

// ข้อมูลการจ่ายปันผลของปีที่เลือก (ถ้าเคยจ่ายแล้ว)
function getPaidInfoForYear(year) {
  const yearPayments = state.data.payments.filter((p) => p.buddhistYear === year);
  if (yearPayments.length === 0) return null;
  const rate = yearPayments[0].rate;
  const periodLabel = yearPayments[0].periodLabel;
  const totalAmount = yearPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDryWeightKg = yearPayments.reduce((sum, p) => sum + p.dryWeightKg, 0);
  return {
    rate,
    periodLabel,
    totalAmount,
    totalDryWeightKg,
    count: yearPayments.length,
    payments: yearPayments,
  };
}

// น้ำหนักยางแห้งรวมของสมาชิกแต่ละคน เฉพาะปีที่เลือก
function dryWeightByMember() {
  const map = new Map();
  for (const purchase of state.data.purchases) {
    if (purchase.buddhistYear !== state.year) continue;
    map.set(purchase.memberId, (map.get(purchase.memberId) ?? 0) + purchase.dryWeightKg);
  }
  return map;
}

// แถวของตารางปันผล: สมาชิกทุกคน พร้อมน้ำหนักและเงินปันผล
function dividendRows(weights, paidMap = null) {
  return state.data.members.map((member) => {
    if (paidMap) {
      const payment = paidMap.get(member.memberId);
      const dryWeightKg = payment ? payment.dryWeightKg : 0;
      const amount = payment ? payment.amount : 0;
      return {
        memberId: member.memberId,
        memberCode: member.memberCode,
        memberName: member.memberName,
        dryWeightKg,
        amount,
      };
    }
    const dryWeightKg = weights.get(member.memberId) ?? 0;
    return {
      memberId: member.memberId,
      memberCode: member.memberCode,
      memberName: member.memberName,
      dryWeightKg,
      amount: state.appliedRate === null ? 0 : dryWeightKg * state.appliedRate,
    };
  });
}

// -----------------------------------------------------------------------------
// วาดหน้า
// -----------------------------------------------------------------------------
function render() {
  const years = availableYears();
  const alreadyPaid = yearAlreadyPaid();
  const paidInfo = alreadyPaid ? getPaidInfoForYear(state.year) : null;

  if (alreadyPaid && paidInfo) {
    state.appliedRate = paidInfo.rate;
    state.appliedPeriodLabel = paidInfo.periodLabel ?? DIVIDEND_PERIOD_LABEL;
  }

  const weights = dryWeightByMember();
  const totalDryWeight = alreadyPaid && paidInfo
    ? paidInfo.totalDryWeightKg
    : [...weights.values()].reduce((sum, w) => sum + w, 0);
  const paidMap = alreadyPaid && paidInfo
    ? new Map(paidInfo.payments.map((p) => [p.memberId, p]))
    : null;
  const rows = dividendRows(weights, paidMap);
  const totalDividend = alreadyPaid && paidInfo
    ? paidInfo.totalAmount
    : (state.appliedRate === null ? null : totalDryWeight * state.appliedRate);

  // ตัวเลือกปี
  const yearKey = years.join(",");
  if (yearSelect.dataset.years !== yearKey) {
    yearSelect.dataset.years = yearKey;
    yearSelect.replaceChildren(
      ...years.map((y) => {
        const option = document.createElement("option");
        option.value = String(y);
        option.textContent = state.data.paidYears.includes(y)
          ? `${y} (จ่ายแล้ว)`
          : String(y);
        return option;
      })
    );
  }
  yearSelect.value = String(state.year);

  // ปี พ.ศ. ในข้อความต่าง ๆ ของหน้า
  setSlot(page, "year", String(state.year));
  setSlot(lockBanner, "next-year", String(state.year + 1));

  // แบนเนอร์ล็อกระบบและสถานะช่องกรอก
  if (alreadyPaid) {
    lockBanner.hidden = false;
    rateInput.value = state.appliedRate !== null ? formatNumber(state.appliedRate) : "";
    rateInput.disabled = true;
    calcSubmitBtn.disabled = true;
  } else {
    lockBanner.hidden = true;
    rateInput.disabled = false;
    calcSubmitBtn.disabled = false;
  }

  byId("rate-error").textContent = state.error ?? "";
  byId("rate-error").hidden = !state.error;

  // การ์ดสรุป
  byId("stat-dry-weight").textContent = `${formatNumber(totalDryWeight)} กก.`;
  byId("stat-total-dividend").textContent =
    totalDividend === null ? "-" : formatCurrency(totalDividend);
  byId("stat-rate").textContent =
    state.appliedRate === null ? "-" : `${formatNumber(state.appliedRate)} บาท/กก.`;
  byId("stat-member-count").textContent = formatNumber(state.data.members.length, 0);

  // ตารางปันผล (ก่อนกด "ตกลง" แสดงคำแนะนำแทน เว้นแต่เป็นปีที่จ่ายแล้วจะแสดงผลอัตโนมัติ)
  const applied = state.appliedRate !== null;
  byId("dividend-placeholder").hidden = applied;
  byId("dividend-result").hidden = !applied;
  if (applied) {
    const pageRows = paginate(rows, state.page, PAGE_SIZE);
    byId("dividend-empty").hidden = pageRows.length !== 0;
    byId("dividend-table").hidden = pageRows.length === 0;
    byId("dividend-rows").replaceChildren(
      ...pageRows.map((row) => {
        const tr = cloneTemplate("dividend-row-template");
        setSlot(tr, "memberName", row.memberName);
        setSlot(tr, "memberCode", row.memberCode);
        setSlot(tr, "dryWeightKg", formatNumber(row.dryWeightKg));
        setSlot(tr, "rate", formatNumber(state.appliedRate));
        setSlot(tr, "amount", formatCurrency(row.amount));
        return tr;
      })
    );
    renderPagination(byId("dividend-pagination"), {
      page: state.page,
      totalPages: totalPagesOf(rows, PAGE_SIZE),
      onPageChange: (next) => {
        state.page = next;
        render();
      },
    });

    byId("applied-period").textContent = state.appliedPeriodLabel;
    byId("pay-locked").hidden = !alreadyPaid;
    byId("pay-blocked").hidden = true;
    byId("pay-done").hidden = !state.paid;
    byId("pay-button").hidden = alreadyPaid;
    byId("pay-button").disabled = state.paid || alreadyPaid;
    byId("pay-error").textContent = state.payError ?? "";
    byId("pay-error").hidden = !state.payError;
  }

  // ข้อความในหน้าต่างยืนยัน
  confirmDialog.setMessage(
    `ท่านต้องการยืนยันการจ่ายเงินปันผลประจำปี ${state.year} หรือไม่ เมื่อยืนยันแล้วปันผลจะถูกบวกเพิ่มในยอดเงินสะสมของสมาชิกทันที และจะไม่สามารถแก้ไขหรือคำนวณปันผลปีนี้ซ้ำได้อีก`
  );

  renderPayoutHistory();
}

// -----------------------------------------------------------------------------
// ฟอร์ม: เปลี่ยนปี / กด "ตกลง"
// -----------------------------------------------------------------------------
yearSelect.addEventListener("change", () => {
  state.year = Number(yearSelect.value);
  state.page = 1;
  state.error = null;
  state.payError = null;
  state.paid = false;
  if (yearAlreadyPaid()) {
    const paidInfo = getPaidInfoForYear(state.year);
    state.appliedRate = paidInfo?.rate ?? null;
    state.appliedPeriodLabel = paidInfo?.periodLabel ?? DIVIDEND_PERIOD_LABEL;
  } else {
    state.appliedRate = null;
    state.appliedPeriodLabel = "";
    rateInput.value = "";
  }
  render();
});

byId("dividend-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const currentBuddhistYear = new Date().getUTCFullYear() + 543;
  if (state.year > currentBuddhistYear) {
    state.error = `ยังไม่ถึงปี พ.ศ. ${state.year} ในปัจจุบัน จึงยังไม่สามารถคำนวณเงินปันผลได้`;
    render();
    return;
  }
  if (yearAlreadyPaid()) return;
  const value = Number(rateInput.value);
  if (!rateInput.value.trim() || Number.isNaN(value) || value <= 0) {
    state.error = "กรุณากรอกอัตราเงินปันผลเป็นตัวเลขมากกว่า 0";
    render();
    return;
  }
  state.error = null;
  state.appliedRate = value;
  state.appliedPeriodLabel = DIVIDEND_PERIOD_LABEL;
  state.page = 1;
  state.paid = false;
  state.payError = null;
  render();
});

// -----------------------------------------------------------------------------
// จ่ายปันผล
// -----------------------------------------------------------------------------
async function handlePayDividend() {
  const currentBuddhistYear = new Date().getUTCFullYear() + 543;
  if (state.year > currentBuddhistYear) {
    state.payError = `ยังไม่ถึงปี พ.ศ. ${state.year} ในปัจจุบัน ไม่สามารถจ่ายเงินปันผลได้`;
    render();
    return;
  }
  state.payError = null;
  render();
  try {
    const res = await fetch("/api/dividends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buddhistYear: state.year,
        periodLabel: state.appliedPeriodLabel,
        rate: state.appliedRate,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถจ่ายเงินปันผลได้");
    }
    state.paid = true;
    if (!state.data.paidYears.includes(state.year)) {
      state.data.paidYears.push(state.year);
    }
    render();
    refreshData(); // โหลดข้อมูลใหม่เบื้องหลัง (ไม่ต้องรอ)
  } catch (error) {
    state.payError = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    render();
  }
}

const confirmDialog = createConfirmDialog(byId("confirm-modal"), {
  onConfirm: handlePayDividend,
});

byId("pay-button").addEventListener("click", () => confirmDialog.open());

// โหลดข้อมูลหน้าใหม่ โดยคงค่าที่ผู้ใช้เลือกไว้ทั้งหมด
async function refreshData() {
  try {
    const { data } = await loadPageData("dividends");
    state.data = data;
    render();
  } catch (error) {
    console.error(error);
  }
}

// -----------------------------------------------------------------------------
// ประวัติการจ่ายปันผล
// -----------------------------------------------------------------------------

// รวมรายการจ่ายรายคนเป็น "รอบการจ่าย" ของแต่ละปี (ปีหนึ่งจ่ายได้ครั้งเดียว)
function groupPayouts(payments) {
  const byYear = new Map();
  for (const payment of payments) {
    let payout = byYear.get(payment.buddhistYear);
    if (!payout) {
      payout = {
        buddhistYear: payment.buddhistYear,
        periodLabel: payment.periodLabel,
        rate: payment.rate,
        paidAt: payment.createdAt,
        totalDryWeightKg: 0,
        totalAmount: 0,
        payments: [],
      };
      byYear.set(payment.buddhistYear, payout);
    }
    payout.totalDryWeightKg += payment.dryWeightKg;
    payout.totalAmount += payment.amount;
    payout.payments.push(payment);
    // รายการในรอบเดียวกันถูกบันทึกห่างกันไม่กี่มิลลิวินาที — ใช้เวลาของรายการแรกสุด
    if (payment.createdAt < payout.paidAt) payout.paidAt = payment.createdAt;
  }
  for (const payout of byYear.values()) {
    payout.payments.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
  }
  return [...byYear.values()].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

function renderPayoutHistory() {
  const payouts = groupPayouts(state.data.payments);
  byId("payout-empty").hidden = payouts.length !== 0;
  byId("payout-table").hidden = payouts.length === 0;
  byId("payout-rows").replaceChildren(
    ...payouts.map((payout) => {
      const row = cloneTemplate("payout-row-template");
      setSlot(row, "paidAt", `${formatDateTimeThai(payout.paidAt)} น.`);
      setSlot(row, "payoutYear", String(payout.buddhistYear));
      const period = row.querySelector('[data-slot="period"]');
      period.textContent = payout.periodLabel ?? "";
      period.hidden = payout.periodLabel === null;
      row.querySelector('[data-slot="no-period"]').hidden = payout.periodLabel !== null;
      setSlot(row, "rate", formatNumber(payout.rate));
      setSlot(row, "count", formatNumber(payout.payments.length, 0));
      setSlot(row, "total", formatCurrency(payout.totalAmount));
      action(row, "detail").addEventListener("click", () => openPayout(payout));
      return row;
    })
  );
}

// หน้าต่างรายละเอียดรอบการจ่าย
const payoutModal = createModal(byId("payout-modal"), { onClose: closePayout });
byId("payout-close").addEventListener("click", closePayout);

function closePayout() {
  state.selectedPayout = null;
  payoutModal.close();
}

function openPayout(payout) {
  state.selectedPayout = payout;
  payoutModal.setTitle(`รายละเอียดการจ่ายปันผลประจำปี ${payout.buddhistYear}`);
  byId("payout-period").textContent = payout.periodLabel ?? "-";
  byId("payout-rate").textContent = `${formatNumber(payout.rate)} บาท/กก.`;
  byId("payout-weight").textContent = `${formatNumber(payout.totalDryWeightKg)} กก.`;
  byId("payout-total").textContent = formatCurrency(payout.totalAmount);
  byId("payout-detail-rows").replaceChildren(
    ...payout.payments.map((payment) => {
      const row = cloneTemplate("payout-detail-row-template");
      setSlot(row, "dividendCode", payment.dividendCode);
      setSlot(row, "memberName", payment.memberName);
      setSlot(row, "memberCode", payment.memberCode);
      setSlot(row, "dryWeightKg", formatNumber(payment.dryWeightKg));
      setSlot(row, "amount", formatNumber(payment.amount));
      setSlot(
        row,
        "balances",
        `${formatNumber(payment.balanceBefore)} → ${formatNumber(payment.balanceAfter)}`
      );
      return row;
    })
  );
  payoutModal.open();
}

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
try {
  const { data } = await loadPageData("dividends");
  state.data = data;
  const years = availableYears();
  state.year = defaultYear(years);
  if (yearAlreadyPaid()) {
    const paidInfo = getPaidInfoForYear(state.year);
    state.appliedRate = paidInfo?.rate ?? null;
    state.appliedPeriodLabel = paidInfo?.periodLabel ?? DIVIDEND_PERIOD_LABEL;
  }
  render();
  byId("page-loading").hidden = true;
  page.hidden = false;
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(page, error);
}

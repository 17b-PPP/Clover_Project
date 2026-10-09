// =============================================================================
// public/js/pages/withdrawals.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการเบิกเงิน" (pages/withdrawals.html)
//
// ขั้นตอนการใช้งาน:
//   1. เลือกสมาชิก → ระบบแสดงชื่อและยอดเงินสะสมปัจจุบัน
//   2. กรอกยอดเงินที่ต้องการเบิก → กด "ยืนยัน" (ตรวจว่ายอดเงินพอ)
//   3. ยืนยันในหน้าต่าง → บันทึก → ฟอร์มถูกล็อก แสดงยอดคงเหลือหลังเบิก
//   4. พิมพ์ใบเสร็จได้ — กด "ยกเลิก" เพื่อเริ่มรายการใหม่
//
// ส่วนประวัติการเบิกเงิน (ด้านล่างของหน้า):
//   - การ์ดจำนวนบิลเบิกเงินของวันนี้
//   - ค้นหาจากชื่อสมาชิก / รหัสสมาชิก / เลขที่รายการ และกรองช่วงวันที่
//     (ค่าเริ่มต้น: วันที่คงที่ → วันนี้) แบ่งหน้าละ 10 รายการ
//   - เบิกเงินสำเร็จแล้วจะโหลดข้อมูลหน้าใหม่ ให้ประวัติแสดงรายการล่าสุดทันที
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import {
  DEFAULT_DATE_FROM,
  formatDateTimeThai,
  formatNumber,
  todayBangkok,
} from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createCombobox } from "../components/combobox.js";
import { createConfirmDialog } from "../components/confirm-dialog.js";
import { createDebouncedLookup } from "../components/debounced-lookup.js";
import { createWithdrawalReceipt } from "../components/withdrawal-receipt.js";
import { startLiveClock } from "../components/live-clock.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";

initSidebar();
startLiveClock(byId("live-clock"));

const amountInput = byId("withdraw-amount");
const confirmButton = byId("confirm-button");
const printButton = byId("print-button");
const formErrorElement = byId("form-error");
const historySearchInput = byId("history-search");
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");
const resetFiltersButton = byId("reset-filters");

const PAGE_SIZE = 10;

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  memberCode: "",
  amount: "",
  saved: null, // รายการเบิกที่บันทึกแล้ว
  submitting: false,
  formError: null,
  member: { loading: false, error: null, data: null }, // ผลการค้นหาสมาชิก

  // ประวัติการเบิกเงิน
  withdrawals: [], // รายการเบิกเงินทั้งหมด (ใหม่สุดก่อน)
  search: "",
  dateFrom: DEFAULT_DATE_FROM, // ช่วงวันที่เริ่มต้น: วันที่คงที่ → วันนี้
  dateTo: todayBangkok(),
  page: 1,
};

const isLocked = () => state.saved !== null;

// ค้นหาสมาชิก (รอ 400ms หลังเลือก)
const memberLookup = createDebouncedLookup(
  (code) => `/api/withdrawals/lookup/${encodeURIComponent(code)}`,
  (lookupState) => {
    state.member = lookupState;
    render();
  }
);

const memberCombobox = createCombobox(byId("member-field"), {
  emptyMessage: "ไม่พบสมาชิกที่ตรงกัน",
  onChange: (value, { immediate } = {}) => {
    state.memberCode = value;
    memberLookup.setCode(value, { immediate });
  },
});

// -----------------------------------------------------------------------------
// วาดหน้าตามสถานะ
// -----------------------------------------------------------------------------
function render() {
  const locked = isLocked();
  const member = state.member;

  memberCombobox.setDisabled(locked);
  memberCombobox.setError(member.error ?? null);
  byId("member-loading").hidden = !member.loading;

  // หลังบันทึกแล้ว แสดงยอดคงเหลือจริงหลังเบิก (แทนยอดก่อนเบิกจากการค้นหา)
  const displayedBalance = state.saved
    ? state.saved.balanceAfter
    : member.data?.walletBalance;
  byId("balance-label").textContent = state.saved
    ? "ยอดเงินคงเหลือหลังเบิก"
    : "ยอดเงินที่มีสะสม";
  byId("balance-value").textContent =
    displayedBalance !== undefined ? displayedBalance.toFixed(2) : "0.00";

  byId("receiver-name").value = member.data?.fullName ?? "";
  amountInput.disabled = locked;

  confirmButton.disabled = locked || state.submitting;
  confirmButton.textContent = state.submitting ? "กำลังบันทึก..." : "ยืนยัน";
  printButton.disabled = !locked;

  formErrorElement.textContent = state.formError ?? "";
  formErrorElement.hidden = !state.formError;

  // ใบเสร็จสำหรับพิมพ์
  const receiptContainer = byId("receipt-container");
  if (state.saved) {
    if (receiptContainer.dataset.withdrawalId !== state.saved.id) {
      receiptContainer.dataset.withdrawalId = state.saved.id;
      receiptContainer.replaceChildren(createWithdrawalReceipt(state.saved));
    }
  } else {
    delete receiptContainer.dataset.withdrawalId;
    receiptContainer.replaceChildren();
  }
}

// -----------------------------------------------------------------------------
// ประวัติการเบิกเงิน
// -----------------------------------------------------------------------------

// วันที่ทำรายการตามเวลาประเทศไทย รูปแบบ YYYY-MM-DD (ใช้เทียบกับตัวกรองวันที่)
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function bangkokDateKey(iso) {
  return bangkokDateFormatter.format(new Date(iso));
}

// รายการที่ตรงกับคำค้นหาและอยู่ในช่วงวันที่
function filteredWithdrawals() {
  const q = state.search.trim().toLowerCase();
  return state.withdrawals.filter((w) => {
    const matchesSearch =
      !q || [w.withdrawalCode, w.memberCode, w.memberName].join(" ").toLowerCase().includes(q);
    const day = bangkokDateKey(w.createdAt);
    const matchesFrom = !state.dateFrom || day >= state.dateFrom;
    const matchesTo = !state.dateTo || day <= state.dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });
}

// สร้างแถวตารางประวัติ 1 แถว
function createHistoryRow(withdrawal) {
  const row = cloneTemplate("history-row-template");
  setSlot(row, "createdAt", formatDateTimeThai(withdrawal.createdAt));
  setSlot(row, "withdrawalCode", withdrawal.withdrawalCode);
  setSlot(row, "memberName", withdrawal.memberName);
  setSlot(row, "memberCode", withdrawal.memberCode);
  setSlot(row, "amount", formatNumber(withdrawal.amount));
  setSlot(
    row,
    "balances",
    `${formatNumber(withdrawal.balanceBefore)} → ${formatNumber(withdrawal.balanceAfter)}`
  );
  return row;
}

// วาดส่วนประวัติทั้งหมด (การ์ดวันนี้ + ตาราง + ตัวแบ่งหน้า)
function renderHistory() {
  const today = todayBangkok();
  const todayWithdrawals = state.withdrawals.filter((w) => bangkokDateKey(w.createdAt) === today);
  const todayCount = todayWithdrawals.length;
  const todayTotal = todayWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

  byId("today-count").textContent = `${formatNumber(todayCount, 0)} บิล`;
  byId("today-total-amount").textContent = `${formatNumber(todayTotal)} บาท`;

  const filtered = filteredWithdrawals();
  const pageItems = paginate(filtered, state.page, PAGE_SIZE);
  byId("history-empty").hidden = pageItems.length !== 0;
  byId("history-table").hidden = pageItems.length === 0;
  byId("history-rows").replaceChildren(...pageItems.map(createHistoryRow));
  renderPagination(byId("history-pagination"), {
    page: state.page,
    totalPages: totalPagesOf(filtered, PAGE_SIZE),
    onPageChange: (page) => {
      state.page = page;
      renderHistory();
    },
  });

  // ปุ่มล้างใช้ได้เมื่อมีคำค้นหา หรือช่วงวันที่ไม่ใช่ค่าเริ่มต้น
  resetFiltersButton.disabled =
    !state.search && state.dateFrom === DEFAULT_DATE_FROM && state.dateTo === today;
}

// เปลี่ยนตัวกรอง → ถ้าค่าเปลี่ยนจริง ให้กลับไปหน้า 1
function setFilter(changes) {
  const changed = Object.entries(changes).some(([key, value]) => state[key] !== value);
  Object.assign(state, changes);
  if (changed) state.page = 1;
  renderHistory();
}

historySearchInput.addEventListener("input", () => setFilter({ search: historySearchInput.value }));
dateFromInput.addEventListener("input", () => setFilter({ dateFrom: dateFromInput.value }));
dateToInput.addEventListener("input", () => setFilter({ dateTo: dateToInput.value }));
// ปุ่มล้าง: ล้างคำค้นหา และกลับไปช่วงวันที่เริ่มต้น
resetFiltersButton.addEventListener("click", () => {
  const defaults = { search: "", dateFrom: DEFAULT_DATE_FROM, dateTo: todayBangkok() };
  historySearchInput.value = "";
  dateFromInput.value = defaults.dateFrom;
  dateToInput.value = defaults.dateTo;
  setFilter(defaults);
});

// โหลดข้อมูลหน้าใหม่ (รายชื่อสมาชิก + ประวัติ) โดยไม่ล้างสิ่งที่ผู้ใช้กรอก/เลือกไว้
async function refreshData() {
  try {
    const data = await loadPageData("withdrawals");
    memberCombobox.setOptions(data.memberOptions);
    state.withdrawals = data.withdrawals;
    renderHistory();
  } catch (error) {
    console.error(error);
  }
}

// -----------------------------------------------------------------------------
// ฟอร์มเบิกเงิน
// -----------------------------------------------------------------------------
amountInput.addEventListener("input", () => {
  state.amount = amountInput.value;
});

// ปุ่ม "ยกเลิก": ล้างฟอร์ม
function resetForm() {
  state.memberCode = "";
  memberCombobox.setValue("");
  memberLookup.setCode("");
  state.amount = "";
  amountInput.value = "";
  state.saved = null;
  state.formError = null;
  render();
}

// ปุ่ม "ยืนยัน": ตรวจข้อมูลก่อนเปิดหน้าต่างยืนยัน
function openConfirm() {
  state.formError = null;

  if (!state.member.data) {
    state.formError = "กรุณากรอกรหัสสมาชิกที่ถูกต้อง";
    render();
    return;
  }
  const value = Number(state.amount);
  if (!value || value <= 0) {
    state.formError = "กรุณากรอกยอดเงินที่ต้องการเบิก";
    render();
    return;
  }
  if (value > state.member.data.walletBalance) {
    state.formError = "ยอดเงินสะสมไม่เพียงพอสำหรับการเบิกครั้งนี้";
    render();
    return;
  }

  render();
  confirmDialog.open();
}

// บันทึกการเบิกเงิน
async function submitWithdrawal() {
  state.submitting = true;
  render();
  try {
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberCode: state.memberCode, amount: Number(state.amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถบันทึกรายการเบิกเงินได้");
    }
    state.saved = data;
    refreshData(); // โหลดประวัติใหม่เบื้องหลัง (ไม่ต้องรอ)
  } catch (error) {
    state.formError = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  } finally {
    state.submitting = false;
    render();
  }
}

const confirmDialog = createConfirmDialog(byId("confirm-modal"), {
  onConfirm: submitWithdrawal,
});

confirmButton.addEventListener("click", openConfirm);
byId("reset-button").addEventListener("click", resetForm);
printButton.addEventListener("click", () => window.print());

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateFromInput.value = state.dateFrom;
dateToInput.value = state.dateTo;

try {
  const data = await loadPageData("withdrawals");
  memberCombobox.setOptions(data.memberOptions);
  state.withdrawals = data.withdrawals;
  render();
  renderHistory();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

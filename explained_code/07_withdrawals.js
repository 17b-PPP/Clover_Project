// =============================================================================
// ไฟล์: explained_code/07_เบิกเงินสะสม_withdrawals.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการเบิกเงิน" (Member Wallet Withdrawals)
// ไฟล์ HTML ที่คู่กัน: pages/withdrawals.html
// เส้นทาง URL: /withdrawals
// ตารางฐานข้อมูลหลัก: Withdrawal, Member (หักยอด walletBalance)
// ความสำคัญทางธุรกิจ:
//   สมาชิกชาวสวนยางที่มียอดเงินสะสมจากการขายยางในกระเป๋าเงิน (Wallet)
//   สามารถมาขอเบิกเงินสดที่สหกรณ์ได้ ระบบจะตรวจสอบยอดคงเหลือและหักเงินทันที
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import {
  DEFAULT_DATE_FROM,
  formatDateTimeThai,
  formatNumber,
  todayBangkok,
} from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createCombobox } from "../public/js/components/combobox.js";
import { createConfirmDialog } from "../public/js/components/confirm-dialog.js";
import { createDebouncedLookup } from "../public/js/components/debounced-lookup.js";
import { createWithdrawalReceipt } from "../public/js/components/withdrawal-receipt.js";
import { startLiveClock } from "../public/js/components/live-clock.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";

initSidebar();
startLiveClock(byId("live-clock"));

const amountInput = byId("withdraw-amount");     // ช่องกรอกจำนวนเงินที่ต้องการเบิก
const confirmButton = byId("confirm-button");     // ปุ่มยืนยันการเบิก
const printButton = byId("print-button");         // ปุ่มพิมพ์ใบเสร็จ
const formErrorElement = byId("form-error");     // ข้อความแจ้งเตือนข้อผิดพลาด
const PAGE_SIZE = 10;                             // จำนวนรายการประวัติต่อหน้า

// สถานะของหน้า
const state = {
  memberCode: "",
  amount: "",
  saved: null,     // ข้อมูลใบเสร็จที่บันทึกแล้ว
  submitting: false,
  formError: null,
  member: { loading: false, error: null, data: null }, // ยอดเงินและชื่อสมาชิกที่ค้นหาได้
  // ประวัติการเบิกเงินด้านล่าง
  withdrawals: [],
  search: "",
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: todayBangkok(),
  page: 1,
};

const isLocked = () => state.saved !== null;

// ค้นหาสมาชิกแบบ Debounced: ดึงยอดเงินคงเหลือใน walletBalance มาแสดง
const memberLookup = createDebouncedLookup(
  (code) => `/api/withdrawals/lookup/${encodeURIComponent(code)}`,
  (lookupState) => {
    state.member = lookupState;
    render();
  }
);

const memberCombobox = createCombobox(byId("member-field"), {
  emptyMessage: "ไม่พบสมาชิกที่ตรงกัน",
  onChange: (value) => {
    state.memberCode = value;
    memberLookup.setCode(value);
  },
});

function render() {
  const locked = isLocked();
  const member = state.member;

  memberCombobox.setDisabled(locked);
  memberCombobox.setError(member.error ?? null);
  byId("member-loading").hidden = !member.loading;

  // หลังบันทึกแล้ว แสดงยอดเงินคงเหลือจริงหลังหัก (balanceAfter)
  const displayedBalance = state.saved
    ? state.saved.balanceAfter
    : member.data?.walletBalance ?? null;

  byId("member-name").textContent = member.data?.memberName ?? "-";
  byId("current-balance").textContent =
    displayedBalance !== null ? formatNumber(displayedBalance) : "-";

  amountInput.disabled = locked;
  confirmButton.disabled = locked || state.submitting;
  printButton.disabled = !locked;

  formErrorElement.textContent = state.formError ?? "";
  formErrorElement.hidden = !state.formError;

  // ใบสำคัญจ่ายเงิน
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

  renderHistory();
}

/**
 * ตรวจสอบความถูกต้องก่อนเปิดหน้าต่างยืนยัน
 */
function openConfirm() {
  state.formError = null;
  if (!state.member.data) {
    state.formError = "กรุณาเลือกรหัสสมาชิกที่ถูกต้อง";
    render();
    return;
  }
  const numAmount = Number(state.amount);
  if (!numAmount || numAmount <= 0) {
    state.formError = "กรุณากรอกจำนวนเงินที่ต้องการเบิกให้ถูกต้อง";
    render();
    return;
  }
  // [กฎสำคัญ] ตรวจสอบว่าจำนวนเงินที่ขอเบิก ต้องไม่มากกว่ายอดเงินสะสมคงเหลือ
  if (numAmount > state.member.data.walletBalance) {
    state.formError = "ยอดเงินคงเหลือไม่เพียงพอสำหรับการเบิก";
    render();
    return;
  }
  render();
  confirmDialog.open();
}

/**
 * ส่งคำขอเบิกเงินไปที่ POST /api/withdrawals
 */
async function submitWithdrawal() {
  state.submitting = true;
  render();
  try {
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberCode: state.memberCode,
        amount: Number(state.amount),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ไม่สามารถทำรายการเบิกเงินได้");
    state.saved = data; // บันทึกสำเร็จ ฟอร์มล็อก แสดงยอดคงเหลือใหม่
    await reloadHistory(); // โหลดตารางประวัติใหม่ทันที
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
printButton.addEventListener("click", () => window.print());

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("withdrawals");
  state.withdrawals = data.withdrawals;
  memberCombobox.setOptions(
    data.memberOptions.map((m) => ({
      value: m.memberCode,
      label: `${m.memberCode} · ${m.firstName} ${m.lastName}`,
    }))
  );
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

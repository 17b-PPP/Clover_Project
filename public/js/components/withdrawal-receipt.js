// =============================================================================
// public/js/components/withdrawal-receipt.js
// -----------------------------------------------------------------------------
// สร้างใบเสร็จเบิกเงิน จาก <template id="withdrawal-receipt-template">
// (โครง HTML อยู่ใน pages/partials/withdrawal-receipt.html)
// ใบเสร็จถูกซ่อนบนจอ และแสดงเฉพาะตอนสั่งพิมพ์
// =============================================================================

import { cloneTemplate, setSlot } from "../core/dom.js";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

// วันที่แบบไทยเต็ม ตามเวลาเครื่อง เช่น "7 ตุลาคม 2569"
function formatThaiDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// เวลา HH:MM ตามเวลาเครื่อง
function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// เลขที่ใบเสร็จ = ตัวเลขในรหัสรายการ เช่น "W-0007" → "7"
function receiptNumber(withdrawalCode) {
  return String(parseInt(withdrawalCode.replace("W-", ""), 10) || 0);
}

export function createWithdrawalReceipt(withdrawal) {
  const receipt = cloneTemplate("withdrawal-receipt-template");
  setSlot(receipt, "memberCode", withdrawal.memberCode);
  setSlot(receipt, "receiptNumber", receiptNumber(withdrawal.withdrawalCode));
  setSlot(receipt, "memberName", withdrawal.memberName);
  setSlot(receipt, "date", formatThaiDate(withdrawal.createdAt));
  setSlot(receipt, "time", formatTime(withdrawal.createdAt));
  setSlot(receipt, "balanceBefore", withdrawal.balanceBefore.toFixed(2));
  setSlot(receipt, "balanceAfter", withdrawal.balanceAfter.toFixed(2));
  setSlot(receipt, "amount", withdrawal.amount.toFixed(2));
  return receipt;
}

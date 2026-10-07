// =============================================================================
// public/js/components/purchase-receipt.js
// -----------------------------------------------------------------------------
// สร้างใบเสร็จรับเงินการรับซื้อน้ำยาง จาก <template id="purchase-receipt-template">
// (โครง HTML อยู่ใน pages/partials/purchase-receipt.html)
//
// onScreen = false (ค่าเริ่มต้น): ใบเสร็จสำหรับ "พิมพ์" — ซ่อนบนจอ แสดงเฉพาะตอนพิมพ์
// onScreen = true : ใบเสร็จแสดงบนจอ (ใช้ในหน้าต่างดูใบเสร็จ)
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

// วันที่แบบไทยเต็ม เช่น "7 ตุลาคม 2569" (อ่านจากส่วน UTC เพราะเป็นวันทำการ)
function formatThaiDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

// เวลาที่บันทึก HH:MM (ตามเวลาเครื่อง)
function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// เลขที่ใบเสร็จ = ตัวเลขในรหัสรายการ เช่น "P-0012" → "12"
function receiptNumber(purchaseCode) {
  return String(parseInt(purchaseCode.replace("P-", ""), 10) || 0);
}

export function createPurchaseReceipt(purchase, { onScreen = false } = {}) {
  const receipt = cloneTemplate("purchase-receipt-template");

  setSlot(receipt, "sellerCode", purchase.sellerCode);
  setSlot(receipt, "receiptNumber", receiptNumber(purchase.purchaseCode));
  setSlot(receipt, "deliveredByName", purchase.deliveredByName);
  setSlot(receipt, "ownerName", purchase.ownerName);
  setSlot(receipt, "date", formatThaiDate(purchase.recordDate));
  setSlot(receipt, "time", formatTime(purchase.createdAt));
  setSlot(receipt, "rawWeightKg", purchase.rawWeightKg.toFixed(0));
  setSlot(receipt, "dryPercentage", purchase.dryPercentage.toFixed(0));
  setSlot(receipt, "dryWeightKg", purchase.dryWeightKg.toFixed(1));
  setSlot(receipt, "totalAmount", purchase.totalAmount.toFixed(0));
  setSlot(receipt, "employeePayout", purchase.employeePayout.toFixed(0));
  setSlot(receipt, "ownerPayout", purchase.ownerPayout.toFixed(0));

  // ห่อด้วย div (สำหรับพิมพ์จะใส่คลาส receipt-print-area)
  const wrapper = document.createElement("div");
  if (!onScreen) wrapper.className = "receipt-print-area";
  wrapper.append(receipt);
  return wrapper;
}

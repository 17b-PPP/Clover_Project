// =============================================================================
// public/js/components/receipt-viewer.js
// -----------------------------------------------------------------------------
// หน้าต่าง "ใบเสร็จเลขที่ ..." สำหรับดู/พิมพ์ใบเสร็จการรับซื้อย้อนหลัง
// (โครง HTML อยู่ใน pages/partials/receipt-modal.html)
//
// ใบเสร็จถูกสร้าง 2 ชุด:
//   1. ชุดแสดงบนจอ ในหน้าต่าง
//   2. ชุดสำหรับพิมพ์ วางนอกหน้าต่าง — เพราะหน้าต่างเป็นชั้นลอย (fixed)
//      ซึ่ง CSS ตอนพิมพ์ดึงออกมาจัดหน้าให้สวยไม่ได้
// =============================================================================

import { byId } from "../core/dom.js";
import { createModal } from "./modal.js";
import { createPurchaseReceipt } from "./purchase-receipt.js";

export function createReceiptViewer() {
  const modal = createModal(byId("receipt-modal"), { onClose: close });
  const body = byId("receipt-modal-body");
  const printContainer = byId("receipt-print-container");

  // ปิดหน้าต่าง และลบใบเสร็จทั้งสองชุด
  function close() {
    modal.close();
    body.replaceChildren();
    printContainer.replaceChildren();
  }

  byId("receipt-modal-close").addEventListener("click", close);
  byId("receipt-modal-print").addEventListener("click", () => window.print());

  return {
    // เปิดดูใบเสร็จของรายการรับซื้อ
    open(purchase) {
      modal.setTitle(`ใบเสร็จเลขที่ ${purchase.purchaseCode}`);
      body.replaceChildren(createPurchaseReceipt(purchase, { onScreen: true }));
      printContainer.replaceChildren(createPurchaseReceipt(purchase));
      modal.open();
    },
  };
}

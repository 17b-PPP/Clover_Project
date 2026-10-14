// =============================================================================
// ไฟล์: explained_code/06_รับซื้อน้ำยางพารา_purchases.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการรับซื้อน้ำยาง" (Rubber Latex Purchasing)
// ไฟล์ HTML ที่คู่กัน: pages/purchases.html
// เส้นทาง URL: /purchases
// ตารางฐานข้อมูลหลัก: Purchase, Member (อัปเดต walletBalance), MePair
// ความสำคัญทางธุรกิจ:
//   เป็นหัวใจหลัก (Core Operation) ของสหกรณ์ในการรับซื้อน้ำยางสดประจำวัน
//   คำนวณเนื้อยางแห้ง DRC %, คิดเงินรวม, แบ่งรายได้ตามสัญญา และพิมพ์ใบเสร็จ
// =============================================================================

// -----------------------------------------------------------------------------
// [ส่วนที่ 1] การนำเข้าโมดูล (Imports)
// -----------------------------------------------------------------------------
import { byId } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createCombobox } from "../public/js/components/combobox.js";
import { createConfirmDialog } from "../public/js/components/confirm-dialog.js";
import { createDebouncedLookup } from "../public/js/components/debounced-lookup.js";
import { createPurchaseReceipt } from "../public/js/components/purchase-receipt.js";
import { startLiveClock } from "../public/js/components/live-clock.js";

// เริ่มต้นระบบ Sidebar และนาฬิกาบอกเวลาแบบเรียลไทม์ (Live Clock) บนหัวกระดาษ
initSidebar();
startLiveClock(byId("live-clock"));

// กำหนดระยะเวลา Polling ตรวจสอบราคากลางอัตโนมัติ: ทุกๆ 15 วินาที (15,000 มิลลิวินาที)
const REFERENCE_PRICE_POLL_MS = 15000;

// ฟังก์ชันแปลงวันที่ปัจจุบันเป็นรูปแบบ YYYY-MM-DD
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// วันที่ปัจจุบันตามเขตเวลาประเทศไทย (Asia/Bangkok)
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function bangkokToday() {
  return bangkokDateFormatter.format(new Date());
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 2] อ้างอิง Element และจัดการสถานะ (Elements & State)
// -----------------------------------------------------------------------------
const marketPriceInput = byId("market-price");      // ช่องราคากลางประจำวัน
const ownerSelectField = byId("owner-select-field"); // กล่องตัวเลือกเจ้าของสวน (กรณีลูกจ้างมีหลายสวน)
const ownerSelect = byId("owner-select");            // Dropdown เจ้าของสวน
const ownerInputField = byId("owner-input-field");   // กล่องแสดงชื่อเจ้าของสวน (กรณีมีสวนเดียว)
const ownerInput = byId("owner-input");              // ช่องแสดงชื่อเจ้าของสวน
const deliveredByInput = byId("delivered-by");      // ช่องแสดงชื่อผู้ส่งน้ำยาง
const rawWeightInput = byId("raw-weight");          // ช่องกรอกน้ำหนักน้ำยางสดสุทธิ (กก.)
const dryPercentageInput = byId("dry-percentage");  // ช่องกรอก % เนื้อยางแห้ง (DRC %)
const dryWeightInput = byId("dry-weight");          // ช่องแสดงน้ำหนักเนื้อยางแห้งที่คำนวณได้
const confirmButton = byId("confirm-button");        // ปุ่ม "ยืนยัน" ทำรายการ
const printButton = byId("print-button");            // ปุ่ม "พิมพ์ใบเสร็จ"
const formErrorElement = byId("form-error");        // ข้อความเตือนความผิดพลาดสีแดง

// สถานะการทำงานของหน้าจอ
const state = {
  recordDate: todayIso(),        // วันที่บันทึกรายการ
  marketPrice: "",               // ราคากลางที่ใช้คิดเงิน
  priceEditedManually: false,    // ตัวแปรเช็คว่าเจ้าหน้าที่พิมพ์แก้ราคาเองหรือไม่
  sellerCode: "",                // รหัสผู้ขาย (M-xxx หรือ E-xxx)
  rawWeightKg: "",               // น้ำหนักสดที่กรอก
  dryPercentage: "",             // % DRC ที่กรอก
  saved: null,                   // เก็บข้อมูลรายการที่บันทึกสำเร็จ (null = ยังไม่บันทึก)
  submitting: false,             // สถานะกำลังส่งข้อมูลไปเซิร์ฟเวอร์
  formError: null,               // ข้อความแจ้งเตือนข้อผิดพลาด
  seller: { loading: false, error: null, data: null }, // ข้อมูลผู้ขายที่ค้นหาได้
  selectedMemberId: "",          // ID ของเจ้าของสวนที่ได้รับเงิน
};

// ตรวจสอบว่าฟอร์มนี้บันทึกเสร็จแล้วหรือยัง (ถ้าเสร็จแล้วจะล็อกฟอร์ม ไม่ให้แก้ไข)
const isLocked = () => state.saved !== null;

// -----------------------------------------------------------------------------
// [ส่วนที่ 3] สูตรคำนวณทางคณิตศาสตร์ (Core Business Calculations)
// -----------------------------------------------------------------------------

/**
 * สูตรที่ 1: น้ำหนักเนื้อยางแห้ง (Dry Rubber Content Weight)
 * สูตร: น้ำหนักน้ำยางสด × (% DRC ÷ 100)
 * ตัวอย่าง: น้ำยางสด 100 กก. วัด DRC ได้ 35% -> เนื้อยางแห้ง = 100 * 0.35 = 35 กก.
 */
function dryWeightKg() {
  const raw = Number(state.rawWeightKg);
  const pct = Number(state.dryPercentage);
  if (!raw || !pct) return 0;
  return (raw * pct) / 100;
}

/**
 * สูตรที่ 2: จำนวนเงินรวมทั้งสิ้น (Total Amount)
 * สูตร: น้ำหนักเนื้อยางแห้ง × ราคากลางประจำวัน
 * ตัวอย่าง: เนื้อยางแห้ง 35 กก. × ราคากลาง 60 บาท/กก. -> ยอดรวม = 2,100 บาท
 */
function totalAmount() {
  const price = Number(state.marketPrice);
  const dry = dryWeightKg();
  if (!price || !dry) return 0;
  return dry * price;
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 4] ระบบค้นหาผู้ขายแบบ Debounce (Seller Lookup with 400ms Debounce)
// -----------------------------------------------------------------------------

// เมื่อเจ้าหน้าที่พิมพ์หรือเลือกรหัสผู้ขาย ระบบจะหน่วงเวลา 400ms ก่อนยิง API
// ช่วยลดภาระของเซิร์ฟเวอร์ ไม่ให้ยิง Request ทุกตัวอักษรที่กำลังพิมพ์
const sellerLookup = createDebouncedLookup(
  (code) => `/api/purchases/lookup/${encodeURIComponent(code)}`,
  (lookupState) => {
    if (lookupState.data !== state.seller.data) {
      state.selectedMemberId = lookupState.data?.memberId ?? "";
    }
    state.seller = lookupState;
    render();
  }
);

// Searchable Combobox สำหรับเลือกผู้ขาย
const sellerCombobox = createCombobox(byId("seller-field"), {
  emptyMessage: "ไม่พบสมาชิกหรือลูกจ้างที่ตรงกัน",
  onChange: (value) => {
    state.sellerCode = value;
    sellerLookup.setCode(value);
  },
});

// -----------------------------------------------------------------------------
// [ส่วนที่ 5] การวาดหน้าจอและการล็อกฟอร์ม (Render & Form Locking)
// -----------------------------------------------------------------------------

function render() {
  const locked = isLocked();
  const seller = state.seller;

  // ควบคุมช่องราคากลาง
  if (marketPriceInput.value !== state.marketPrice) {
    marketPriceInput.value = state.marketPrice;
  }
  marketPriceInput.disabled = locked;

  // ควบคุมช่องผู้ขาย
  sellerCombobox.setDisabled(locked);
  sellerCombobox.setError(seller.error ?? null);
  byId("seller-loading").hidden = !seller.loading;

  // กรณีผู้ส่งเป็นลูกจ้างและมีสัญญาผูกกับเจ้าของสวนหลายราย
  const ownerOptions = seller.data?.ownerOptions ?? [];
  const multipleOwners = Boolean(seller.data) && ownerOptions.length > 1;
  ownerSelectField.hidden = !multipleOwners;
  ownerInputField.hidden = multipleOwners;

  if (multipleOwners) {
    ownerSelect.value = state.selectedMemberId;
    ownerSelect.disabled = locked;
  }
  const selectedOwner = ownerOptions.find((o) => o.memberId === state.selectedMemberId) ?? null;
  ownerInput.value = selectedOwner?.ownerName ?? "";
  deliveredByInput.value = seller.data?.deliveredByName ?? "";

  // ควบคุมช่องกรอกน้ำหนักและคำนวณผลลัพธ์
  rawWeightInput.disabled = locked;
  dryPercentageInput.disabled = locked;
  const dry = dryWeightKg();
  dryWeightInput.value = dry ? dry.toFixed(2) : "";

  // ควบคุมสถานะปุ่ม
  confirmButton.disabled = locked || state.submitting;
  confirmButton.textContent = state.submitting ? "กำลังบันทึก..." : "ยืนยัน";
  printButton.disabled = !locked; // ปุ่มพิมพ์ใบเสร็จจะกดได้ก็ต่อเมื่อบันทึกแล้วเท่านั้น

  formErrorElement.textContent = state.formError ?? "";
  formErrorElement.hidden = !state.formError;

  // แสดงยอดเงินรวม
  const total = totalAmount();
  byId("total-amount").textContent = total ? total.toFixed(2) : "0.00";

  // แสดงตัวอย่างใบเสร็จพร้อมพิมพ์เมื่อบันทึกเสร็จ
  const receiptContainer = byId("receipt-container");
  if (state.saved) {
    if (receiptContainer.dataset.purchaseId !== state.saved.id) {
      receiptContainer.dataset.purchaseId = state.saved.id;
      receiptContainer.replaceChildren(createPurchaseReceipt(state.saved));
    }
  } else {
    delete receiptContainer.dataset.purchaseId;
    receiptContainer.replaceChildren();
  }

  updatePolling();
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 6] ระบบตรวจสอบราคากลางอัตโนมัติ (15s Real-time Polling)
// -----------------------------------------------------------------------------

let pollKey = null;
let stopPolling = () => {};

function updatePolling() {
  const key = `${state.priceEditedManually}|${isLocked()}`;
  if (key === pollKey) return;
  pollKey = key;
  stopPolling();
  stopPolling = () => {};

  // หากเจ้าหน้าที่แก้ไขราคาด้วยตัวเอง หรือฟอร์มถูกล็อกแล้ว ให้หยุด Poll
  if (state.priceEditedManually || isLocked()) return;

  let cancelled = false;
  async function syncPrice() {
    try {
      const res = await fetch(`/api/reference-price?date=${bangkokToday()}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (data.price !== null) {
        state.marketPrice = String(data.price);
        render();
      }
    } catch {
      // กรณีเน็ตหลุด ไม่แสดงข้อผิดพลาด เดี๋ยวรอบถัดไปจะลองใหม่เอง
    }
  }

  syncPrice();
  const interval = setInterval(syncPrice, REFERENCE_PRICE_POLL_MS);
  stopPolling = () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// ดักจับการพิมพ์ราคากลางด้วยมือ
marketPriceInput.addEventListener("input", () => {
  state.marketPrice = marketPriceInput.value;
  state.priceEditedManually = true; // บันทึกว่าผู้ใช้แก้ราคาเอง จะหยุด Auto-poll ทันที
  render();
});

rawWeightInput.addEventListener("input", () => {
  state.rawWeightKg = rawWeightInput.value;
  render();
});

dryPercentageInput.addEventListener("input", () => {
  state.dryPercentage = dryPercentageInput.value;
  render();
});

// -----------------------------------------------------------------------------
// [ส่วนที่ 7] การตรวจสอบความถูกต้องและการบันทึก (Validation & Submit)
// -----------------------------------------------------------------------------

function openConfirm() {
  state.formError = null;

  if (!state.seller.data) {
    state.formError = "กรุณากรอกรหัสสมาชิกหรือรหัสลูกจ้างที่ถูกต้อง";
    render();
    return;
  }
  const price = Number(state.marketPrice);
  const raw = Number(state.rawWeightKg);
  const pct = Number(state.dryPercentage);

  if (!price || price <= 0) {
    state.formError = "กรุณากรอกราคากลางประจำวัน";
    render();
    return;
  }
  if (!raw || raw <= 0) {
    state.formError = "กรุณากรอกน้ำหนักน้ำยางสดสุทธิ";
    render();
    return;
  }
  if (!pct || pct <= 0 || pct > 100) {
    state.formError = "กรุณากรอกเนื้อยางแห้งให้ถูกต้อง (0-100%)";
    render();
    return;
  }

  render();
  confirmDialog.open(); // เปิด Modal ยืนยันข้อมูลก่อนบันทึกจริง
}

async function submitPurchase() {
  state.submitting = true;
  render();
  try {
    // ถ้ามีการแก้ราคากลางด้วยมือ ให้บันทึกราคาใหม่ของวันนี้ลงระบบด้วย
    if (state.priceEditedManually) {
      try {
        await fetch("/api/reference-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: bangkokToday(),
            price: Number(state.marketPrice),
          }),
        });
      } catch {}
    }

    // ส่งข้อมูลบันทึกการรับซื้อน้ำยางไปที่เซิร์ฟเวอร์
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordDate: state.recordDate,
        marketPrice: Number(state.marketPrice),
        sellerCode: state.sellerCode,
        rawWeightKg: Number(state.rawWeightKg),
        dryPercentage: Number(state.dryPercentage),
        memberId: state.selectedMemberId || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถบันทึกรายการรับซื้อได้");
    }

    // บันทึกสำเร็จ: นำข้อมูลที่ได้มาใส่ใน state.saved (ฟอร์มจะถูกล็อกและแสดงใบเสร็จ)
    state.saved = data;

  } catch (error) {
    state.formError = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  } finally {
    state.submitting = false;
    render();
  }
}

const confirmDialog = createConfirmDialog(byId("confirm-modal"), {
  onConfirm: submitPurchase,
});

confirmButton.addEventListener("click", openConfirm);

// ปุ่มยกเลิก/เริ่มรายการใหม่
byId("reset-button").addEventListener("click", () => {
  state.sellerCode = "";
  sellerCombobox.setValue("");
  sellerLookup.setCode("");
  state.selectedMemberId = "";
  state.rawWeightKg = "";
  rawWeightInput.value = "";
  state.dryPercentage = "";
  dryPercentageInput.value = "";
  state.saved = null; // ปลดล็อกฟอร์ม
  state.formError = null;
  state.priceEditedManually = false;
  render();
});

// ปุ่มพิมพ์ใบเสร็จ
printButton.addEventListener("click", () => window.print());

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("purchases");
  state.marketPrice = data.initialMarketPrice ?? "";
  sellerCombobox.setOptions(
    data.sellerOptions.map((option) => ({
      value: option.code,
      label:
        option.kind === "employee"
          ? `${option.code} · ${option.name} (ลูกจ้าง)`
          : `${option.code} · ${option.name}`,
    }))
  );
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

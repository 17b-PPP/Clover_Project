// =============================================================================
// public/js/pages/purchases.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการรับซื้อน้ำยาง" (pages/purchases.html)
//
// ขั้นตอนการใช้งาน:
//   1. ราคากลางของวันนี้ถูกเติมให้อัตโนมัติ และตรวจซ้ำทุก 15 วินาที
//      (ถ้าผู้ดูแลแก้ราคา จะเห็นราคาใหม่โดยไม่ต้องรีเฟรช) — หยุดตรวจเมื่อผู้ใช้แก้ราคาเอง
//   2. เลือกผู้ขาย (สมาชิก M- หรือลูกจ้าง E-) → ระบบค้นหาเจ้าของสวน/ผู้ส่งน้ำยางให้
//   3. กรอกน้ำหนักน้ำยางสด และ % เนื้อยางแห้ง → คำนวณน้ำหนักยางแห้งและยอดเงินรวม
//   4. กด "ยืนยัน" → ตรวจข้อมูล → หน้าต่างยืนยัน → บันทึก
//      (ถ้าแก้ราคากลางเอง จะบันทึกราคาของวันนี้ก่อน)
//   5. บันทึกแล้วฟอร์มถูกล็อก และพิมพ์ใบเสร็จได้ — กด "ยกเลิก" เพื่อเริ่มรายการใหม่
// =============================================================================

import { byId } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { initSidebar } from "../components/sidebar.js";
import { createCombobox } from "../components/combobox.js";
import { createConfirmDialog } from "../components/confirm-dialog.js";
import { createDebouncedLookup } from "../components/debounced-lookup.js";
import { createPurchaseReceipt } from "../components/purchase-receipt.js";
import { startLiveClock } from "../components/live-clock.js";

initSidebar();
startLiveClock(byId("live-clock"));

// ทุก 15 วินาที ตรวจราคากลางล่าสุดของวันนี้
const REFERENCE_PRICE_POLL_MS = 15000;

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

// วันที่วันนี้แบบ YYYY-MM-DD (ตามเวลา UTC เหมือนของเดิม) ใช้เป็นวันที่บันทึกรายการ
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// วันที่วันนี้ตามเวลาประเทศไทย (ราคากลางถูกตั้งตามวันของไทย)
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function bangkokToday() {
  return bangkokDateFormatter.format(new Date());
}

// "2026-10-07" → "7 ตุลาคม 2569"
function formatThaiDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

// -----------------------------------------------------------------------------
// องค์ประกอบในหน้า
// -----------------------------------------------------------------------------
const marketPriceInput = byId("market-price");
const ownerSelectField = byId("owner-select-field");
const ownerSelect = byId("owner-select");
const ownerInputField = byId("owner-input-field");
const ownerInput = byId("owner-input");
const deliveredByInput = byId("delivered-by");
const rawWeightInput = byId("raw-weight");
const dryPercentageInput = byId("dry-percentage");
const dryWeightInput = byId("dry-weight");
const confirmButton = byId("confirm-button");
const printButton = byId("print-button");
const formErrorElement = byId("form-error");

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  recordDate: todayIso(),
  marketPrice: "",
  priceEditedManually: false, // ผู้ใช้แก้ราคากลางเองหรือไม่
  sellerCode: "",
  rawWeightKg: "",
  dryPercentage: "",
  saved: null, // รายการที่บันทึกแล้ว (null = ยังไม่บันทึก)
  submitting: false,
  formError: null,
  seller: { loading: false, error: null, data: null }, // ผลการค้นหาผู้ขาย
  selectedMemberId: "", // เจ้าของสวนที่เลือก
};

const isLocked = () => state.saved !== null;

// น้ำหนักยางแห้ง = น้ำหนักสด × % เนื้อยาง ÷ 100
function dryWeightKg() {
  const raw = Number(state.rawWeightKg);
  const pct = Number(state.dryPercentage);
  if (!raw || !pct) return 0;
  return (raw * pct) / 100;
}

// จำนวนเงินรวม = น้ำหนักยางแห้ง × ราคากลาง
function totalAmount() {
  const price = Number(state.marketPrice);
  const dry = dryWeightKg();
  if (!price || !dry) return 0;
  return dry * price;
}

// -----------------------------------------------------------------------------
// การค้นหาผู้ขาย (รอ 400ms หลังเลือก)
// -----------------------------------------------------------------------------
const sellerLookup = createDebouncedLookup(
  (code) => `/api/purchases/lookup/${encodeURIComponent(code)}`,
  (lookupState) => {
    // เมื่อข้อมูลผู้ขายเปลี่ยน ให้เลือกเจ้าของสวนเริ่มต้นตามข้อมูลใหม่
    if (lookupState.data) {
      state.selectedMemberId =
        lookupState.data.memberId ??
        lookupState.data.ownerOptions?.[0]?.memberId ??
        "";
    } else if (!lookupState.loading) {
      state.selectedMemberId = "";
    }
    state.seller = lookupState;
    render();
  }
);

const sellerCombobox = createCombobox(byId("seller-field"), {
  emptyMessage: "ไม่พบสมาชิกหรือลูกจ้างที่ตรงกัน",
  onChange: (value, { immediate } = {}) => {
    state.sellerCode = value;
    sellerLookup.setCode(value, { immediate });
  },
});

// -----------------------------------------------------------------------------
// วาดหน้าตามสถานะปัจจุบัน
// -----------------------------------------------------------------------------
function render() {
  const locked = isLocked();
  const seller = state.seller;

  // ราคากลาง
  if (marketPriceInput.value !== state.marketPrice) marketPriceInput.value = state.marketPrice;
  marketPriceInput.disabled = locked;

  // ช่องผู้ขาย
  sellerCombobox.setDisabled(locked);
  sellerCombobox.setError(seller.error ?? null);
  byId("seller-loading").hidden = !seller.loading;

  // เจ้าของสวน: หลายคน → ช่องเลือก, คนเดียว/ไม่มี → ช่องแสดงชื่อ
  const ownerOptions = seller.data?.ownerOptions ?? [];
  const multipleOwners = Boolean(seller.data) && ownerOptions.length > 1;
  ownerSelectField.hidden = !multipleOwners;
  ownerInputField.hidden = multipleOwners;
  if (multipleOwners) {
    const optionKey = ownerOptions.map((o) => `${o.memberId}:${o.ownerName}`).join("|");
    if (ownerSelect.dataset.optionKey !== optionKey) {
      ownerSelect.dataset.optionKey = optionKey;
      ownerSelect.replaceChildren(
        ...ownerOptions.map((o) => {
          const option = document.createElement("option");
          option.value = o.memberId;
          option.textContent = o.ownerName;
          return option;
        })
      );
    }
    ownerSelect.value = state.selectedMemberId;
    ownerSelect.disabled = locked;
  }
  const selectedOwner = ownerOptions.find((o) => o.memberId === state.selectedMemberId) ?? null;
  ownerInput.value = selectedOwner?.ownerName ?? seller.data?.ownerName ?? "";

  deliveredByInput.value = seller.data?.deliveredByName ?? "";

  // น้ำหนัก
  rawWeightInput.disabled = locked;
  dryPercentageInput.disabled = locked;
  const dry = dryWeightKg();
  dryWeightInput.value = dry ? dry.toFixed(2) : "";

  // ปุ่ม
  confirmButton.disabled = locked || state.submitting;
  confirmButton.textContent = state.submitting ? "กำลังบันทึก..." : "ยืนยัน";
  printButton.disabled = !locked;

  formErrorElement.textContent = state.formError ?? "";
  formErrorElement.hidden = !state.formError;

  // ยอดเงินรวม
  const total = totalAmount();
  byId("total-amount").textContent = total ? total.toFixed(2) : "0.00";

  // ใบเสร็จ (สำหรับพิมพ์)
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
// ตรวจราคากลางของวันนี้ซ้ำทุก 15 วินาที
// หยุดเมื่อผู้ใช้แก้ราคาเอง หรือเมื่อบันทึกรายการแล้ว (ไม่ให้ไปเปลี่ยนราคาที่ใช้ไปแล้ว)
// -----------------------------------------------------------------------------
let pollKey = null;
let stopPolling = () => {};

function updatePolling() {
  const key = `${state.priceEditedManually}|${isLocked()}`;
  if (key === pollKey) return; // เงื่อนไขไม่เปลี่ยน ไม่ต้องเริ่มใหม่
  pollKey = key;
  stopPolling();
  stopPolling = () => {};
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
      // เครือข่ายขัดข้อง — รอบถัดไปจะลองใหม่เอง
    }
  }

  syncPrice();
  const interval = setInterval(syncPrice, REFERENCE_PRICE_POLL_MS);
  stopPolling = () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// -----------------------------------------------------------------------------
// การกรอกข้อมูล
// -----------------------------------------------------------------------------
marketPriceInput.addEventListener("input", () => {
  state.marketPrice = marketPriceInput.value;
  state.priceEditedManually = true;
  render();
});

ownerSelect.addEventListener("change", () => {
  state.selectedMemberId = ownerSelect.value;
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
// ปุ่ม "ยกเลิก": ล้างฟอร์มเพื่อเริ่มรายการใหม่ (ราคากลางคงไว้)
// -----------------------------------------------------------------------------
function resetForm() {
  state.sellerCode = "";
  sellerCombobox.setValue("");
  sellerLookup.setCode("");
  state.selectedMemberId = "";
  state.rawWeightKg = "";
  rawWeightInput.value = "";
  state.dryPercentage = "";
  dryPercentageInput.value = "";
  state.saved = null;
  state.formError = null;
  state.priceEditedManually = false;
  render();
}

// -----------------------------------------------------------------------------
// ปุ่ม "ยืนยัน": ตรวจข้อมูลก่อน แล้วจึงเปิดหน้าต่างยืนยัน
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
  confirmDialog.open();
}

// บันทึกรายการ (เรียกเมื่อกดยืนยันในหน้าต่างยืนยัน)
async function submitPurchase() {
  state.submitting = true;
  render();
  try {
    // ถ้าแก้ราคากลางเอง ให้บันทึกเป็นราคาของวันนี้ด้วย (ล้มเหลวก็ยังบันทึกรายการต่อได้)
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
      } catch {
        // ไม่ต้องทำอะไร
      }
    }

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
byId("reset-button").addEventListener("click", resetForm);
printButton.addEventListener("click", () => window.print());

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
byId("record-date").textContent = formatThaiDate(state.recordDate);

try {
  const data = await loadPageData("purchases");
  state.marketPrice = data.initialMarketPrice ?? "";
  // ตัวเลือกผู้ขาย: ลูกจ้างมีคำว่า "(ลูกจ้าง)" ต่อท้าย
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

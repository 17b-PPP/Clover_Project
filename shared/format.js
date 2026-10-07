// =============================================================================
// shared/format.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดรูปแบบตัวเลข/วันที่/เวลา เป็นภาษาไทย
//
// ไฟล์นี้ใช้ร่วมกัน 2 ฝั่ง:
//   - ฝั่งเซิร์ฟเวอร์ import โดยตรง (เช่น ตอนสร้างไฟล์ Excel)
//   - ฝั่งหน้าเว็บโหลดผ่าน URL /shared/format.js (server.js เปิดให้โหลดได้)
//
// ทุกฟังก์ชันใช้ Intl ของ JavaScript กับ locale "th-TH"
// จึงได้ปีเป็นพุทธศักราชและชื่อเดือนภาษาไทยอัตโนมัติ
// =============================================================================

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

// จัดรูปแบบเงินบาท เช่น 1234.5 → "฿1,234.50"
export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

// วันที่แบบย่อ ตามเขตเวลาของเครื่องที่แสดงผล เช่น "7 ต.ค. 2569"
export function formatDate(iso) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

// วันที่แบบย่อ โดยอ่านตามเวลา UTC
// ใช้กับวันที่ที่เก็บเป็น "เที่ยงคืน UTC ของวันทำการ" (เช่น recordDate ของการรับซื้อ)
export function formatDateUtc(iso) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}

// วันที่และเวลา ตามเขตเวลาของเครื่องที่แสดงผล
export function formatDateTime(iso) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// เหมือน formatDateTime แต่ล็อกเป็นเวลาประเทศไทย (Asia/Bangkok) เสมอ
// ไม่ว่าเครื่องที่แสดงผลจะตั้งเขตเวลาไว้อย่างไร
export function formatDateTimeThai(iso) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

// เฉพาะเวลา (ชั่วโมง:นาที) ตามเวลาประเทศไทย
// ใช้คู่กับ formatDateUtc ในรายงานที่แสดงวันทำการ + เวลาที่บันทึก
export function formatTimeThai(iso) {
  return new Intl.DateTimeFormat("th-TH", {
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

const bangkokDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// วันที่ "วันนี้" ตามเวลาประเทศไทย รูปแบบ YYYY-MM-DD
// ใช้เป็นค่าเริ่มต้นของช่อง "ถึงวันที่" ในตัวกรองช่วงวันที่ทุกหน้า
export function todayBangkok() {
  return bangkokDayFormatter.format(new Date());
}

// ค่าเริ่มต้นของช่อง "จากวันที่" ในตัวกรองช่วงวันที่ทุกหน้า
export const DEFAULT_DATE_FROM = "2026-06-23";

// จัดรูปแบบตัวเลขมีจุลภาค และกำหนดจำนวนทศนิยม (ค่าเริ่มต้น 2 ตำแหน่ง)
// เช่น formatNumber(1234.5) → "1,234.50", formatNumber(12, 0) → "12"
export function formatNumber(value, fractionDigits = 2) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

// แปลงคีย์เดือน "YYYY-MM" (ที่กราฟรายเดือนใช้จัดกลุ่ม) เป็นวันแรก/วันสุดท้ายของเดือน
// เพื่อนำไปใส่เป็นช่วงวันที่ (from/to) ของตัวกรองได้ทันที
export function monthKeyToDateRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    from: `${monthKey}-01`,
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

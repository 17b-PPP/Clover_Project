// =============================================================================
// server/lib/thai-address.js
// -----------------------------------------------------------------------------
// ค้นหาอำเภอ/จังหวัดจากรหัสไปรษณีย์ (ใช้ฐานข้อมูลที่อยู่ไทยจากแพ็กเกจ
// thai-address-database)
//
// ใช้ตอนกรอกฟอร์มสมาชิก/ลูกจ้าง: พิมพ์รหัสไปรษณีย์ครบ 5 หลักแล้วระบบจะ
// เติมอำเภอและจังหวัดให้อัตโนมัติ
//
// ผลลัพธ์: รายการ { amphoe, province } ที่ไม่ซ้ำกัน
// =============================================================================

import { searchAddressByZipcode } from "thai-address-database";

export function lookupPostalCode(postalCode) {
  // ต้องเป็นตัวเลข 5 หลักเท่านั้น
  if (!/^[0-9]{5}$/.test(postalCode)) return [];

  // ค้นหาแบบตรงตัว (^...$) สูงสุด 50 รายการ
  const entries = searchAddressByZipcode(`^${postalCode}$`, 50);

  // รหัสไปรษณีย์เดียวอาจมีหลายตำบลในอำเภอเดียวกัน จึงตัดคู่อำเภอ+จังหวัดที่ซ้ำออก
  const seen = new Set();
  const results = [];
  for (const entry of entries) {
    const key = `${entry.amphoe}|${entry.province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ amphoe: entry.amphoe, province: entry.province });
  }
  return results;
}

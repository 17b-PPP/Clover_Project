// =============================================================================
// server/lib/api-error.js
// -----------------------------------------------------------------------------
// ตัวจัดการข้อผิดพลาดกลางของ API
//
// เมื่อเกิด error ที่ไม่ได้คาดไว้ใน API ใด ๆ จะ:
//   1. พิมพ์ error ลง console ของเซิร์ฟเวอร์ (ไว้ตรวจสอบ)
//   2. ตอบกลับสถานะ 500 พร้อม { error: "<ข้อความ>" } ในรูปแบบ JSON
// =============================================================================

export function handleRouteError(res, error) {
  console.error(error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(500).json({ error: message });
}

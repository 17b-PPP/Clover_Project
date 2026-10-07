// =============================================================================
// server/lib/request-body.js
// -----------------------------------------------------------------------------
// อ่านข้อมูล JSON ที่หน้าเว็บส่งมากับ request (POST / PATCH)
//
// server.js ตั้งให้ Express เก็บ body ดิบเป็นข้อความไว้ใน req.body
// ฟังก์ชันนี้แปลงข้อความนั้นเป็น object ด้วย JSON.parse
//
// ถ้า body ว่างหรือไม่ใช่ JSON จะ "โยน error" ออกไป แล้ว API จะตอบ 500
// ซึ่งเป็นพฤติกรรมเดียวกับ request.json() ของ Next.js เดิม
// =============================================================================

export function readJsonBody(req) {
  const text = typeof req.body === "string" ? req.body : "";
  return JSON.parse(text);
}

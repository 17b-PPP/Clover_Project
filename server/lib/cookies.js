// =============================================================================
// server/lib/cookies.js
// -----------------------------------------------------------------------------
// อ่านค่า cookie จาก request ของ Express
//
// เบราว์เซอร์ส่ง cookie มาใน header เดียวรูปแบบ  "ชื่อ1=ค่า1; ชื่อ2=ค่า2"
// ฟังก์ชันนี้แยกออกเป็นรายการ แล้วคืนค่าของ cookie ชื่อที่ต้องการ
// (เดิม Next.js มี cookies() ให้ใช้ แต่ Express ไม่มี จึงเขียนเอง)
// =============================================================================

// คืนค่า cookie ตามชื่อ หรือ undefined ถ้าไม่มี
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const raw = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

// =============================================================================
// public/js/core/safe-redirect.js
// -----------------------------------------------------------------------------
// ตรวจค่า ?next= ในหน้าเข้าสู่ระบบ ก่อนพาผู้ใช้ไปหน้านั้นหลังเข้าสู่ระบบสำเร็จ
//
// ป้องกันการถูกหลอกให้ไปเว็บอื่น (open redirect): ยอมรับเฉพาะ path ในเว็บเดียวกัน
// เช่น "/members" ใช้ได้ แต่ "https://evil.com" หรือ "//evil.com" จะใช้ค่าสำรองแทน
// =============================================================================

// rawNext  = ค่า next จาก URL (หรือ null)
// fallback = หน้าที่จะไปถ้า next ไม่ปลอดภัย/ไม่มี
export function sanitizeNext(rawNext, fallback) {
  if (!rawNext) return fallback;
  try {
    const url = new URL(rawNext, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const path = url.pathname + url.search + url.hash;
    // ตรวจผลลัพธ์ซ้ำอีกรอบ: path ที่ได้อาจเริ่มด้วย "//" ซึ่งเบราว์เซอร์จะตีความ
    // เป็นเว็บอื่นได้ จึงต้องแปลงกลับแล้วยังได้เว็บเดิมและได้ path เดิมเท่านั้น
    const recheck = new URL(path, window.location.origin);
    if (recheck.origin !== window.location.origin) return fallback;
    if (recheck.pathname + recheck.search + recheck.hash !== path) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

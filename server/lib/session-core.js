// =============================================================================
// server/lib/session-core.js
// -----------------------------------------------------------------------------
// สร้างและถอดรหัส "session token" ของพนักงาน (Staff/Admin)
//
// token มีรูปแบบ  "<ข้อมูล JSON แบบ base64url>.<ลายเซ็น HMAC-SHA256>"
//   - ข้อมูล (payload): staffId, username, ชื่อ, นามสกุล, role, exp (เวลาหมดอายุ)
//   - ลายเซ็นสร้างจาก SESSION_SECRET ใน .env ทำให้ปลอมแปลง token ไม่ได้
//
// payload ที่ได้มีหน้าตา:
//   { staffId, username, firstName, lastName, role: "STAFF" | "ADMIN", exp }
// =============================================================================

import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // อายุ 7 วัน

// อ่านรหัสลับสำหรับเซ็น token จาก .env
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

// เซ็นข้อความด้วย HMAC-SHA256 แล้วแปลงเป็น base64url
function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

// แปลง payload เป็น token สำหรับเก็บใน cookie
export function encodeSession(payload) {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(json);
  return `${json}.${signature}`;
}

// ถอด token กลับเป็น payload
// คืนค่า null ถ้า token ไม่มี, รูปแบบผิด, ลายเซ็นไม่ตรง หรือหมดอายุแล้ว
export function decodeSession(token) {
  if (!token) return null;
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expectedSignature = sign(json);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// =============================================================================
// server/lib/member-session-core.js
// -----------------------------------------------------------------------------
// สร้างและถอดรหัส session token ของ "สมาชิก" (ฝั่งพอร์ทัลสมาชิก)
//
// ทำงานเหมือน session-core.js แต่:
//   - ใช้ cookie คนละชื่อ ("member_session")
//   - payload มี type: "member" และข้อมูลสมาชิก
//   - กุญแจที่ใช้เซ็นถูก "แปลง" จาก SESSION_SECRET อีกชั้น เพื่อให้ token ของ
//     สมาชิกไม่มีทางผ่านการตรวจของฝั่งพนักงานได้ (แม้ใช้ SESSION_SECRET ตัวเดียวกัน)
//
// payload: { type: "member", memberId, memberCode, firstName, lastName, exp }
// =============================================================================

import crypto from "node:crypto";

export const MEMBER_SESSION_COOKIE_NAME = "member_session";
export const MEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // อายุ 7 วัน

// สร้างกุญแจเฉพาะของสมาชิกจาก SESSION_SECRET
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.createHmac("sha256", secret).update("member-session-v1").digest();
}

// เซ็นข้อความด้วยกุญแจของสมาชิก
function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

// แปลง payload ของสมาชิกเป็น token
export function encodeMemberSession(payload) {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(json);
  return `${json}.${signature}`;
}

// ถอด token ของสมาชิก — คืน null ถ้าไม่ถูกต้องทุกกรณี
export function decodeMemberSession(token) {
  if (!token) return null;
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expectedSignature = sign(json);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (payload.type !== "member") return null;
    if (typeof payload.memberId !== "string" || payload.memberId.length === 0) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

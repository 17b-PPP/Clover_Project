// =============================================================================
// server/lib/member-session.js
// -----------------------------------------------------------------------------
// จัดการ cookie "member_session" ของสมาชิก บน request/response ของ Express
// (ทำงานเหมือน session.js แต่สำหรับฝั่งสมาชิก)
// =============================================================================

import { readCookie } from "./cookies.js";
import {
  MEMBER_SESSION_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
  decodeMemberSession,
  encodeMemberSession,
} from "./member-session-core.js";

// สร้าง cookie หลังสมาชิกเข้าสู่ระบบสำเร็จ (เติม type และ exp ให้อัตโนมัติ)
export function createMemberSessionCookie(res, payload) {
  const exp = Date.now() + MEMBER_SESSION_TTL_SECONDS * 1000;
  const token = encodeMemberSession({ ...payload, type: "member", exp });
  res.cookie(MEMBER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_SESSION_TTL_SECONDS * 1000,
  });
}

// อ่าน session ของสมาชิกจาก request (คืน null ถ้าไม่มีหรือไม่ถูกต้อง)
export function getMemberSession(req) {
  return decodeMemberSession(readCookie(req, MEMBER_SESSION_COOKIE_NAME));
}

// ลบ cookie ของสมาชิก
export function destroyMemberSessionCookie(res) {
  res.clearCookie(MEMBER_SESSION_COOKIE_NAME, { path: "/" });
}

// =============================================================================
// server/lib/session.js
// -----------------------------------------------------------------------------
// จัดการ cookie "session" ของพนักงาน บน request/response ของ Express
//
// - createSessionCookie   : ตั้ง cookie หลังเข้าสู่ระบบสำเร็จ
// - getSession            : อ่าน cookie แล้วถอดเป็นข้อมูลผู้ใช้ (หรือ null)
// - destroySessionCookie  : ลบ cookie ตอนออกจากระบบ
//
// cookie ตั้งเป็น httpOnly (JavaScript ฝั่งหน้าเว็บอ่านไม่ได้) และ sameSite=lax
// ตอนรันแบบ production จะเพิ่ม secure (ส่งเฉพาะผ่าน https) เหมือนของเดิม
// =============================================================================

import { readCookie } from "./cookies.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  decodeSession,
  encodeSession,
} from "./session-core.js";

// สร้าง cookie session ใหม่ (payload ไม่ต้องมี exp — ฟังก์ชันนี้เติมให้)
export function createSessionCookie(res, payload) {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = encodeSession({ ...payload, exp });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000, // Express ใช้หน่วยมิลลิวินาที
  });
}

// อ่าน session ของพนักงานจาก request (คืน null ถ้ายังไม่ได้เข้าสู่ระบบ)
export function getSession(req) {
  return decodeSession(readCookie(req, SESSION_COOKIE_NAME));
}

// ลบ cookie session
export function destroySessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

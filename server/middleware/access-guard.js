// =============================================================================
// server/middleware/access-guard.js
// -----------------------------------------------------------------------------
// ตัวตรวจสิทธิ์การเข้าถึงทุก request (แทน proxy.ts ของ Next.js เดิม)
//
// กฎการทำงาน (เหมือนของเดิมทุกข้อ):
//   1. /api/auth/* และ /api/member-auth/* ผ่านได้เลย (ใช้เข้าสู่ระบบ)
//   2. หน้า /member/* ของสมาชิก:
//        - /member/login ถ้าเข้าสู่ระบบอยู่แล้ว → พาไป /member/dashboard
//        - หน้าอื่นถ้ายังไม่เข้าสู่ระบบ → พาไป /member/login?next=<หน้าเดิม>
//   3. /api/member-portal/* (API ข้อมูลของสมาชิก — เพิ่มใหม่ในเวอร์ชันนี้)
//        ถ้ายังไม่เข้าสู่ระบบสมาชิก → ตอบ 401
//   4. ส่วนที่เหลือเป็นของพนักงาน:
//        - /login ถ้าเข้าสู่ระบบอยู่แล้ว → พาไปหน้าแรก "/"
//        - ยังไม่เข้าสู่ระบบ: API → 401, หน้าเว็บ → /login?next=<หน้าเดิม>
//        - หน้า/API เฉพาะผู้ดูแลระบบ แต่ role ไม่ใช่ ADMIN:
//          API → 403, หน้าเว็บ → พากลับหน้าแรก "/"
//
// ไฟล์ CSS/JS/ฟอนต์ ถูกส่งก่อนถึงตัวตรวจนี้ (ดู server.js) จึงโหลดได้เสมอ
// เหมือนที่ proxy.ts เดิมยกเว้น /_next/static ไว้
// =============================================================================

import { SESSION_COOKIE_NAME, decodeSession } from "../lib/session-core.js";
import {
  MEMBER_SESSION_COOKIE_NAME,
  decodeMemberSession,
} from "../lib/member-session-core.js";
import { readCookie } from "../lib/cookies.js";

// เส้นทางที่เฉพาะผู้ดูแลระบบ (ADMIN) เข้าได้
const ADMIN_ONLY_PATHS = [
  "/users",
  "/audit-log",
  "/api/users",
  "/api/audit-log",
  // API ข้อมูลเริ่มต้นของสองหน้าข้างบน (เพิ่มใหม่ในเวอร์ชันนี้)
  "/api/page-data/users",
  "/api/page-data/audit-log",
];

// ตรวจว่า pathname เป็นเส้นทางเฉพาะผู้ดูแลระบบหรือไม่ (รวมเส้นทางย่อย)
function isAdminOnlyPath(pathname) {
  return ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

// สร้าง URL หน้าเข้าสู่ระบบ พร้อมจำหน้าเดิมไว้ใน ?next= เพื่อกลับมาหลังเข้าสู่ระบบ
function loginUrlWithNext(loginPath, pathname) {
  return `${loginPath}?next=${encodeURIComponent(pathname)}`;
}

export function accessGuard(req, res, next) {
  const pathname = req.path;

  // 1) เส้นทางเข้าสู่ระบบ — ไม่ต้องตรวจ
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/member-auth")) {
    return next();
  }

  // 2) หน้าเว็บของสมาชิก
  if (pathname === "/member" || pathname.startsWith("/member/")) {
    const memberSession = decodeMemberSession(
      readCookie(req, MEMBER_SESSION_COOKIE_NAME)
    );

    if (pathname === "/member/login") {
      if (memberSession) {
        return res.redirect(307, "/member/dashboard");
      }
      return next();
    }

    if (!memberSession) {
      return res.redirect(307, loginUrlWithNext("/member/login", pathname));
    }

    return next();
  }

  // 3) API ข้อมูลของพอร์ทัลสมาชิก
  if (pathname === "/api/member-portal" || pathname.startsWith("/api/member-portal/")) {
    const memberSession = decodeMemberSession(
      readCookie(req, MEMBER_SESSION_COOKIE_NAME)
    );
    if (!memberSession) {
      return res
        .status(401)
        .json({ error: "Unauthorized", redirect: "/member/login" });
    }
    return next();
  }

  // 4) ส่วนของพนักงาน
  const session = decodeSession(readCookie(req, SESSION_COOKIE_NAME));

  if (pathname === "/login") {
    if (session) {
      return res.redirect(307, "/");
    }
    return next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect(307, loginUrlWithNext("/login", pathname));
  }

  if (isAdminOnlyPath(pathname) && session.role !== "ADMIN") {
    if (pathname.startsWith("/api")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.redirect(307, "/");
  }

  return next();
}

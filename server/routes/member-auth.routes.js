// =============================================================================
// server/routes/member-auth.routes.js
// -----------------------------------------------------------------------------
// API การเข้าสู่ระบบของสมาชิก (แทน app/api/member-auth/* ของเดิม)
//
//   POST /api/member-auth/login         เข้าสู่ระบบด้วยเลขบัตรประชาชน + วันเกิด
//   POST /api/member-auth/logout        ออกจากระบบ
//   GET  /api/member-auth/force-logout  บังคับออกจากระบบ แล้วพาไปหน้าเข้าสู่ระบบ
//                                       (ใช้เมื่อสมาชิกถูกระงับระหว่างใช้งาน)
// =============================================================================

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  createMemberSessionCookie,
  destroyMemberSessionCookie,
} from "../lib/member-session.js";
import { handleRouteError } from "../lib/api-error.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed } from "../lib/http.js";

export const memberAuthRouter = Router();

// แปลงวันเกิด 8 หลัก DDMMYYYY (ที่สมาชิกพิมพ์) เป็น "YYYY-MM-DD"
// เพื่อเทียบกับวันเกิดในฐานข้อมูล — ถ้าไม่ใช่ตัวเลข 8 หลักพอดีจะคืน null
// (ไม่ตรวจว่าเป็นวันที่ที่มีอยู่จริง เพราะค่าผิดจะไม่ตรงกับข้อมูลอยู่ดี)
function parseDdmmyyyy(input) {
  if (!/^\d{8}$/.test(input)) return null;
  const day = input.slice(0, 2);
  const month = input.slice(2, 4);
  const year = input.slice(4, 8);
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// POST /api/member-auth/login
// ---------------------------------------------------------------------------
memberAuthRouter
  .route("/login")
  .post(async (req, res) => {
    try {
      const { idCardNumber, dateOfBirth } = readJsonBody(req);

      if (!idCardNumber || !dateOfBirth) {
        return res
          .status(400)
          .json({ error: "กรุณากรอกเลขบัตรประชาชนและวันเกิด" });
      }

      const member = await prisma.member.findUnique({
        where: { idCardNumber },
      });

      // ตรวจว่าวันเกิดที่กรอกตรงกับในฐานข้อมูลหรือไม่
      const parsedDob = parseDdmmyyyy(dateOfBirth);
      const dobMatches =
        member !== null &&
        parsedDob !== null &&
        member.dateOfBirth.toISOString().slice(0, 10) === parsedDob;

      if (!member || !dobMatches) {
        return res
          .status(401)
          .json({ error: "เลขบัตรประชาชนหรือวันเกิดไม่ถูกต้อง" });
      }

      if (member.status !== "Active") {
        return res
          .status(403)
          .json({ error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
      }

      createMemberSessionCookie(res, {
        memberId: member.id,
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
      });

      return res.json({
        id: member.id,
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

// ---------------------------------------------------------------------------
// POST /api/member-auth/logout
// ---------------------------------------------------------------------------
memberAuthRouter
  .route("/logout")
  .post(async (req, res) => {
    try {
      destroyMemberSessionCookie(res);
      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

// ---------------------------------------------------------------------------
// GET /api/member-auth/force-logout
// ลบ cookie แล้ว redirect ไปหน้าเข้าสู่ระบบสมาชิก
// ---------------------------------------------------------------------------
memberAuthRouter
  .route("/force-logout")
  .get((req, res) => {
    destroyMemberSessionCookie(res);
    return res.redirect(307, "/member/login");
  })
  .all(methodNotAllowed(["GET"]));

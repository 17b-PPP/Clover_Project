// =============================================================================
// server/routes/auth.routes.js
// -----------------------------------------------------------------------------
// API การเข้าสู่ระบบของพนักงาน (แทน app/api/auth/* ของเดิม)
//
//   POST /api/auth/login            เข้าสู่ระบบด้วยชื่อผู้ใช้งาน + รหัสผ่าน
//   POST /api/auth/logout           ออกจากระบบ
//   POST /api/auth/change-password  เปลี่ยนรหัสผ่านของตัวเอง
//
// หมายเหตุ: เส้นทาง /api/auth/* ไม่ผ่านตัวตรวจสิทธิ์ (access-guard)
// เพราะต้องเรียกได้ตั้งแต่ยังไม่เข้าสู่ระบบ
// =============================================================================

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import {
  createSessionCookie,
  destroySessionCookie,
  getSession,
} from "../lib/session.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed } from "../lib/http.js";

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ตรวจชื่อผู้ใช้งาน/รหัสผ่าน → บันทึก log → ตั้ง cookie session
// ---------------------------------------------------------------------------
authRouter
  .route("/login")
  .post(async (req, res) => {
    try {
      const { username, password } = readJsonBody(req);

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน" });
      }

      const staff = await prisma.staff.findUnique({ where: { username } });

      // ชื่อผู้ใช้งานไม่มี หรือรหัสผ่านผิด
      if (!staff || !verifyPassword(password, staff.password)) {
        // ถ้ามีบัญชีนี้อยู่จริง ให้บันทึกว่าเข้าสู่ระบบไม่สำเร็จ
        if (staff) {
          await prisma.activityLog.create({
            data: {
              staffId: staff.id,
              action: "LOGIN_FAILED",
              status: "FAILED",
              description: "เข้าสู่ระบบไม่สำเร็จ (รหัสผ่านไม่ถูกต้อง)",
            },
          });
        }
        return res
          .status(401)
          .json({ error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" });
      }

      // บัญชีถูกระงับ
      if (staff.status !== "Active") {
        return res
          .status(403)
          .json({ error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
      }

      createSessionCookie(res, {
        staffId: staff.id,
        username: staff.username,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
      });

      await prisma.activityLog.create({
        data: {
          staffId: staff.id,
          action: "LOGIN",
          status: "SUCCESS",
          description: "เข้าสู่ระบบสำเร็จ",
        },
      });

      return res.json({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        username: staff.username,
        role: staff.role,
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// บันทึก log การออกจากระบบ (ถ้ามี session) แล้วลบ cookie
// ---------------------------------------------------------------------------
authRouter
  .route("/logout")
  .post(async (req, res) => {
    try {
      const session = getSession(req);
      if (session) {
        await prisma.activityLog.create({
          data: {
            staffId: session.staffId,
            action: "LOGOUT",
            status: "SUCCESS",
            description: "ออกจากระบบ",
          },
        });
      }
      destroySessionCookie(res);
      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// ตรวจรหัสผ่านปัจจุบัน → บันทึกรหัสผ่านใหม่ → เลิกสถานะ "ใช้รหัสตั้งต้น"
// ---------------------------------------------------------------------------
authRouter
  .route("/change-password")
  .post(async (req, res) => {
    try {
      const session = getSession(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { currentPassword, newPassword } = readJsonBody(req);

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
      }

      const staff = await prisma.staff.findUnique({
        where: { id: session.staffId },
      });
      if (!staff || !verifyPassword(currentPassword, staff.password)) {
        return res.status(400).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }

      await prisma.staff.update({
        where: { id: staff.id },
        data: {
          password: hashPassword(newPassword),
          usingDefaultPassword: false,
        },
      });

      await logActivity(req, {
        action: "UPDATE_STAFF",
        targetType: "STAFF",
        targetId: staff.id,
        description: `เปลี่ยนรหัสผ่านของตนเอง (${staff.username})`,
      });

      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

// =============================================================================
// server/routes/users.routes.js
// -----------------------------------------------------------------------------
// API จัดการบัญชีผู้ใช้งาน (แทน app/api/users/* ของเดิม) — เฉพาะผู้ดูแลระบบ
// (access-guard ตรวจสิทธิ์ ADMIN ให้ก่อนเข้ามาถึงไฟล์นี้)
//
//   GET    /api/users        รายชื่อผู้ใช้งานทั้งหมด
//   POST   /api/users        เพิ่มผู้ใช้งานใหม่
//   GET    /api/users/:id    ข้อมูลผู้ใช้งาน 1 คน
//   PATCH  /api/users/:id    แก้ไขข้อมูล หรือเปลี่ยนสถานะ
//   DELETE /api/users/:id    ลบผู้ใช้งาน (ต้องระงับก่อน และลบตัวเองไม่ได้)
// =============================================================================

import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  setUserStatus,
  updateUser,
} from "../lib/data/users.js";
import { handleRouteError } from "../lib/api-error.js";
import { dateToDdmmyyyy, isValidPhone } from "../lib/validate.js";
import { logActivity } from "../lib/activity-log.js";
import { getSession } from "../lib/session.js";
import { readJsonBody } from "../lib/request-body.js";
import { isPrismaError, methodNotAllowed } from "../lib/http.js";

export const usersRouter = Router();

// ฟิลด์ที่ต้องกรอกเมื่อเพิ่มผู้ใช้งานใหม่ (รหัสผ่านเว้นว่างได้)
const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "username",
  "dateOfBirth",
  "role",
];

usersRouter
  .route("/")
  // GET /api/users
  .get(async (req, res) => {
    try {
      return res.json(await getUsers());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST /api/users
  // ถ้าไม่กรอกรหัสผ่าน จะใช้วันเกิด (DDMMYYYY) เป็นรหัสผ่านเริ่มต้น
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      const missing = REQUIRED_FIELDS.filter((field) => !body[field]);
      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      if (!isValidPhone(body.phone)) {
        return res.status(400).json({ error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" });
      }

      try {
        const usingDefaultPassword = !body.password;
        const user = await createUser({
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          email: body.email,
          username: body.username,
          dateOfBirth: body.dateOfBirth,
          role: body.role,
          password: body.password || dateToDdmmyyyy(body.dateOfBirth),
          usingDefaultPassword,
        });
        await logActivity(req, {
          action: "CREATE_STAFF",
          targetType: "STAFF",
          targetId: user.id,
          description: `เพิ่มผู้ใช้งานใหม่ ${user.username} (${user.firstName} ${user.lastName})`,
        });
        return res.status(201).json(user);
      } catch (error) {
        // ชื่อผู้ใช้งานหรืออีเมลซ้ำกับบัญชีที่มีอยู่
        if (isPrismaError(error, "P2002")) {
          return res
            .status(409)
            .json({ error: "ชื่อผู้ใช้งานหรืออีเมลนี้ถูกใช้งานแล้ว" });
        }
        throw error;
      }
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

usersRouter
  .route("/:id")
  // GET /api/users/:id
  .get(async (req, res) => {
    try {
      const user = await getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(user);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // PATCH /api/users/:id — มี status = เปลี่ยนสถานะ, ไม่มี = แก้ไขข้อมูล
  .patch(async (req, res) => {
    try {
      const { id } = req.params;
      const body = readJsonBody(req);

      if (body.status) {
        const updated = await setUserStatus(id, body.status);
        if (!updated) {
          return res.status(404).json({ error: "User not found" });
        }
        await logActivity(req, {
          action: "SUSPEND_STAFF",
          targetType: "STAFF",
          targetId: updated.id,
          description: `${
            body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
          }ผู้ใช้งาน ${updated.username} (${updated.firstName} ${updated.lastName})`,
        });
        return res.json(updated);
      }

      if (body.phone && !isValidPhone(body.phone)) {
        return res.status(400).json({ error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" });
      }

      const updated = await updateUser(id, body);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      await logActivity(req, {
        action: "UPDATE_STAFF",
        targetType: "STAFF",
        targetId: updated.id,
        description: `แก้ไขข้อมูลผู้ใช้งาน ${updated.username} (${updated.firstName} ${updated.lastName})`,
      });
      return res.json(updated);
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        return res
          .status(409)
          .json({ error: "ชื่อผู้ใช้งานหรืออีเมลนี้ถูกใช้งานแล้ว" });
      }
      return handleRouteError(res, error);
    }
  })
  // DELETE /api/users/:id
  .delete(async (req, res) => {
    try {
      const { id } = req.params;
      const user = await getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.status !== "Inactive") {
        return res
          .status(400)
          .json({ error: "ต้องระงับผู้ใช้งานก่อนจึงจะลบได้" });
      }

      // ห้ามลบบัญชีของตัวเอง
      const session = getSession(req);
      if (session?.staffId === id) {
        return res.status(400).json({ error: "ไม่สามารถลบบัญชีของตนเองได้" });
      }

      try {
        await deleteUser(id);
      } catch (error) {
        // ผู้ใช้งานนี้มีประวัติการใช้งาน (log) อ้างอิงอยู่
        if (isPrismaError(error, "P2003")) {
          return res.status(409).json({
            error:
              "ไม่สามารถลบผู้ใช้งานนี้ได้เนื่องจากมีประวัติการใช้งานที่เกี่ยวข้อง",
          });
        }
        throw error;
      }

      await logActivity(req, {
        action: "DELETE_STAFF",
        targetType: "STAFF",
        targetId: user.id,
        description: `ลบผู้ใช้งาน ${user.username} (${user.firstName} ${user.lastName})`,
      });

      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));

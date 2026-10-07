// =============================================================================
// server/routes/members.routes.js
// -----------------------------------------------------------------------------
// API จัดการสมาชิก (แทน app/api/members/* ของเดิม)
//
//   GET    /api/members        รายชื่อสมาชิกทั้งหมด
//   POST   /api/members        เพิ่มสมาชิกใหม่
//   GET    /api/members/:id    ข้อมูลสมาชิก 1 คน (รวมรูปถ่าย)
//   PATCH  /api/members/:id    แก้ไขข้อมูล หรือเปลี่ยนสถานะ (ถ้าส่ง status มา)
//   DELETE /api/members/:id    ลบสมาชิก (ต้องระงับก่อน)
// =============================================================================

import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMember,
  getMembers,
  memberIdCardNumberExists,
  memberPhoneExists,
  setMemberStatus,
  updateMember,
} from "../lib/data/members.js";
import { handleRouteError } from "../lib/api-error.js";
import {
  duplicateFieldsMessage,
  isValidIdCardNumber,
  isValidPhone,
} from "../lib/validate.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { isPrismaError, methodNotAllowed } from "../lib/http.js";

export const membersRouter = Router();

// ฟิลด์ที่ต้องกรอกเมื่อเพิ่มสมาชิกใหม่
const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "idCardNumber",
  "dateOfBirth",
  "phone",
  "address",
  "district",
  "province",
  "postalCode",
];

membersRouter
  .route("/")
  // -------------------------------------------------------------------------
  // GET /api/members
  // -------------------------------------------------------------------------
  .get(async (req, res) => {
    try {
      return res.json(await getMembers());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // -------------------------------------------------------------------------
  // POST /api/members — ตรวจข้อมูลครบ/รูปแบบ/ข้อมูลซ้ำ แล้วจึงบันทึก
  // -------------------------------------------------------------------------
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      const missing = REQUIRED_FIELDS.filter((field) => !body[field]);
      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      if (!isValidIdCardNumber(body.idCardNumber)) {
        return res
          .status(400)
          .json({ error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" });
      }
      if (!isValidPhone(body.phone)) {
        return res.status(400).json({ error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" });
      }
      const duplicateMessage = duplicateFieldsMessage(
        await memberIdCardNumberExists(body.idCardNumber),
        await memberPhoneExists(body.phone)
      );
      if (duplicateMessage) {
        return res.status(409).json({ error: duplicateMessage });
      }

      let member;
      try {
        member = await createMember({
          firstName: body.firstName,
          lastName: body.lastName,
          idCardNumber: body.idCardNumber,
          dateOfBirth: body.dateOfBirth,
          phone: body.phone,
          address: body.address,
          district: body.district,
          province: body.province,
          postalCode: body.postalCode,
          photoUrl: body.photoUrl ?? null,
          gardenName: body.gardenName ?? null,
        });
      } catch (error) {
        // กันกรณีมีคนเพิ่มเลขบัตรเดียวกันเข้ามาพร้อมกันพอดี
        if (isPrismaError(error, "P2002")) {
          return res.status(409).json({
            error: "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข",
          });
        }
        throw error;
      }

      await logActivity(req, {
        action: "CREATE_MEMBER",
        targetType: "MEMBER",
        targetId: member.id,
        description: `เพิ่มสมาชิกใหม่ ${member.memberCode} (${member.firstName} ${member.lastName})`,
      });

      return res.status(201).json(member);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

membersRouter
  .route("/:id")
  // -------------------------------------------------------------------------
  // GET /api/members/:id
  // -------------------------------------------------------------------------
  .get(async (req, res) => {
    try {
      const member = await getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      return res.json(member);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // -------------------------------------------------------------------------
  // PATCH /api/members/:id
  // ถ้ามี status → เปลี่ยนสถานะอย่างเดียว, ถ้าไม่มี → แก้ไขข้อมูลทั่วไป
  // -------------------------------------------------------------------------
  .patch(async (req, res) => {
    try {
      const { id } = req.params;
      const body = readJsonBody(req);

      if (body.status) {
        const updated = await setMemberStatus(id, body.status);
        if (!updated) {
          return res.status(404).json({ error: "Member not found" });
        }
        await logActivity(req, {
          action: "SUSPEND_MEMBER",
          targetType: "MEMBER",
          targetId: updated.id,
          description: `${
            body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
          }สมาชิก ${updated.memberCode} (${updated.firstName} ${updated.lastName})`,
        });
        return res.json(updated);
      }

      if (body.idCardNumber && !isValidIdCardNumber(body.idCardNumber)) {
        return res
          .status(400)
          .json({ error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" });
      }
      if (body.phone && !isValidPhone(body.phone)) {
        return res.status(400).json({ error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" });
      }
      const duplicateMessage = duplicateFieldsMessage(
        body.idCardNumber
          ? await memberIdCardNumberExists(body.idCardNumber, id)
          : false,
        body.phone ? await memberPhoneExists(body.phone, id) : false
      );
      if (duplicateMessage) {
        return res.status(409).json({ error: duplicateMessage });
      }

      let updated;
      try {
        updated = await updateMember(id, body);
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return res.status(409).json({
            error: "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข",
          });
        }
        throw error;
      }
      if (!updated) {
        return res.status(404).json({ error: "Member not found" });
      }
      await logActivity(req, {
        action: "UPDATE_MEMBER",
        targetType: "MEMBER",
        targetId: updated.id,
        description: `แก้ไขข้อมูลสมาชิก ${updated.memberCode} (${updated.firstName} ${updated.lastName})`,
      });
      return res.json(updated);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // -------------------------------------------------------------------------
  // DELETE /api/members/:id — ลบได้เฉพาะสมาชิกที่ถูกระงับแล้ว
  // -------------------------------------------------------------------------
  .delete(async (req, res) => {
    try {
      const { id } = req.params;
      const member = await getMember(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      if (member.status !== "Inactive") {
        return res.status(400).json({ error: "ต้องระงับสมาชิกก่อนจึงจะลบได้" });
      }

      try {
        await deleteMember(id);
      } catch (error) {
        // มีข้อมูลอื่น (เช่น สัญญาจ้าง) อ้างอิงสมาชิกคนนี้อยู่
        if (isPrismaError(error, "P2003")) {
          return res.status(409).json({
            error: "ไม่สามารถลบสมาชิกได้ เนื่องจากมีสัญญาจ้างที่เกี่ยวข้องอยู่",
          });
        }
        throw error;
      }

      await logActivity(req, {
        action: "DELETE_MEMBER",
        targetType: "MEMBER",
        targetId: member.id,
        description: `ลบสมาชิก ${member.memberCode} (${member.firstName} ${member.lastName})`,
      });

      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));

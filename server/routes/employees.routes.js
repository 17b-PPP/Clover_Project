// =============================================================================
// server/routes/employees.routes.js
// -----------------------------------------------------------------------------
// API จัดการลูกจ้าง (แทน app/api/employees/* ของเดิม)
//
//   GET    /api/employees        รายชื่อลูกจ้างทั้งหมด
//   POST   /api/employees        เพิ่มลูกจ้างใหม่
//   GET    /api/employees/:id    ข้อมูลลูกจ้าง 1 คน (รวมรูปถ่าย)
//   PATCH  /api/employees/:id    แก้ไขข้อมูล หรือเปลี่ยนสถานะ
//   DELETE /api/employees/:id    ลบลูกจ้าง (ต้องระงับก่อน)
// =============================================================================

import { Router } from "express";
import {
  createEmployee,
  deleteEmployee,
  employeeIdCardNumberExists,
  employeePhoneExists,
  getEmployee,
  getEmployees,
  setEmployeeStatus,
  updateEmployee,
} from "../lib/data/employees.js";
import { handleRouteError } from "../lib/api-error.js";
import {
  duplicateFieldsMessage,
  isValidIdCardNumber,
  isValidPhone,
} from "../lib/validate.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { isPrismaError, methodNotAllowed } from "../lib/http.js";

export const employeesRouter = Router();

// ฟิลด์ที่ต้องกรอกเมื่อเพิ่มลูกจ้างใหม่
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

employeesRouter
  .route("/")
  // GET /api/employees
  .get(async (req, res) => {
    try {
      return res.json(await getEmployees());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST /api/employees — ตรวจข้อมูลครบ/รูปแบบ/ข้อมูลซ้ำ แล้วจึงบันทึก
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
        await employeeIdCardNumberExists(body.idCardNumber),
        await employeePhoneExists(body.phone)
      );
      if (duplicateMessage) {
        return res.status(409).json({ error: duplicateMessage });
      }

      let employee;
      try {
        employee = await createEmployee({
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
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return res.status(409).json({
            error: "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข",
          });
        }
        throw error;
      }

      await logActivity(req, {
        action: "CREATE_EMPLOYEE",
        targetType: "EMPLOYEE",
        targetId: employee.id,
        description: `เพิ่มลูกจ้างใหม่ ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`,
      });

      return res.status(201).json(employee);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

employeesRouter
  .route("/:id")
  // GET /api/employees/:id
  .get(async (req, res) => {
    try {
      const employee = await getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      return res.json(employee);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // PATCH /api/employees/:id — มี status = เปลี่ยนสถานะ, ไม่มี = แก้ไขข้อมูล
  .patch(async (req, res) => {
    try {
      const { id } = req.params;
      const body = readJsonBody(req);

      if (body.status) {
        const updated = await setEmployeeStatus(id, body.status);
        if (!updated) {
          return res.status(404).json({ error: "Employee not found" });
        }
        await logActivity(req, {
          action: "SUSPEND_EMPLOYEE",
          targetType: "EMPLOYEE",
          targetId: updated.id,
          description: `${
            body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
          }ลูกจ้าง ${updated.employeeCode} (${updated.firstName} ${updated.lastName})`,
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
          ? await employeeIdCardNumberExists(body.idCardNumber, id)
          : false,
        body.phone ? await employeePhoneExists(body.phone, id) : false
      );
      if (duplicateMessage) {
        return res.status(409).json({ error: duplicateMessage });
      }

      let updated;
      try {
        updated = await updateEmployee(id, body);
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return res.status(409).json({
            error: "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข",
          });
        }
        throw error;
      }
      if (!updated) {
        return res.status(404).json({ error: "Employee not found" });
      }
      await logActivity(req, {
        action: "UPDATE_EMPLOYEE",
        targetType: "EMPLOYEE",
        targetId: updated.id,
        description: `แก้ไขข้อมูลลูกจ้าง ${updated.employeeCode} (${updated.firstName} ${updated.lastName})`,
      });
      return res.json(updated);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // DELETE /api/employees/:id — ลบได้เฉพาะลูกจ้างที่ถูกระงับแล้ว
  .delete(async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await getEmployee(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      if (employee.status !== "Inactive") {
        return res.status(400).json({ error: "ต้องระงับลูกจ้างก่อนจึงจะลบได้" });
      }

      try {
        await deleteEmployee(id);
      } catch (error) {
        if (isPrismaError(error, "P2003")) {
          return res.status(409).json({
            error: "ไม่สามารถลบลูกจ้างได้ เนื่องจากมีสัญญาจ้างที่เกี่ยวข้องอยู่",
          });
        }
        throw error;
      }

      await logActivity(req, {
        action: "DELETE_EMPLOYEE",
        targetType: "EMPLOYEE",
        targetId: employee.id,
        description: `ลบลูกจ้าง ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`,
      });

      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));

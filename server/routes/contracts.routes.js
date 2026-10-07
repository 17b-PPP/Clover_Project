// =============================================================================
// server/routes/contracts.routes.js
// -----------------------------------------------------------------------------
// API จัดการสัญญาจ้าง (แทน app/api/contracts/* ของเดิม)
//
//   GET    /api/contracts           สัญญาทั้งหมด
//   POST   /api/contracts           เพิ่มสัญญาใหม่
//   GET    /api/contracts/history   ประวัติสัญญาของคู่สมาชิก–ลูกจ้าง
//                                   (?memberId=...&employeeId=...)
//   GET    /api/contracts/:id       สัญญา 1 ฉบับ
//   PATCH  /api/contracts/:id       แก้ไขสัดส่วนรายได้ หรือเปลี่ยนสถานะ
//   DELETE /api/contracts/:id       ลบสัญญา (ต้องระงับก่อน)
//
// หมายเหตุ: ต้องประกาศ /history ก่อน /:id ไม่อย่างนั้นคำว่า "history"
// จะถูกตีความเป็น id
// =============================================================================

import { Router } from "express";
import {
  createContract,
  deleteContract,
  getContract,
  getContractHistory,
  getContracts,
  setContractStatus,
  updateContractShares,
} from "../lib/data/contracts.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed, queryParam } from "../lib/http.js";

export const contractsRouter = Router();

// ฟิลด์ที่ต้องมีเมื่อเพิ่มสัญญาใหม่
const REQUIRED_FIELDS = ["memberId", "employeeId", "memberShare", "employeeShare"];

contractsRouter
  .route("/")
  // GET /api/contracts
  .get(async (req, res) => {
    try {
      return res.json(await getContracts());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST /api/contracts
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      // ค่า 0 ถือว่ากรอกแล้ว (เช็คเฉพาะ undefined / null)
      const missing = REQUIRED_FIELDS.filter(
        (field) => body[field] === undefined || body[field] === null
      );
      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      const contract = await createContract({
        memberId: body.memberId,
        employeeId: body.employeeId,
        memberShare: body.memberShare,
        employeeShare: body.employeeShare,
      });

      await logActivity(req, {
        action: "CREATE_CONTRACT",
        targetType: "CONTRACT",
        targetId: contract.id,
        description: `เพิ่มสัญญาจ้างใหม่ ${contract.pairCode} (${contract.member.firstName} ${contract.member.lastName} ↔ ${contract.employee.firstName} ${contract.employee.lastName})`,
      });

      return res.status(201).json(contract);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

// GET /api/contracts/history?memberId=...&employeeId=...
contractsRouter
  .route("/history")
  .get(async (req, res) => {
    try {
      const memberId = queryParam(req, "memberId");
      const employeeId = queryParam(req, "employeeId");

      if (!memberId || !employeeId) {
        return res.status(400).json({
          error: "Missing required query params: memberId, employeeId",
        });
      }

      return res.json(await getContractHistory(memberId, employeeId));
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

contractsRouter
  .route("/:id")
  // GET /api/contracts/:id
  .get(async (req, res) => {
    try {
      const contract = await getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      return res.json(contract);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // PATCH /api/contracts/:id — มี status = เปลี่ยนสถานะ, ไม่มี = แก้ไขสัดส่วน
  .patch(async (req, res) => {
    try {
      const { id } = req.params;
      const body = readJsonBody(req);

      if (body.status) {
        const updated = await setContractStatus(id, body.status);
        if (!updated) {
          return res.status(404).json({ error: "Contract not found" });
        }
        await logActivity(req, {
          action: "SUSPEND_CONTRACT",
          targetType: "CONTRACT",
          targetId: updated.id,
          description: `${
            body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
          }สัญญาจ้าง ${updated.pairCode}`,
        });
        return res.json(updated);
      }

      if (body.memberShare === undefined || body.employeeShare === undefined) {
        return res.status(400).json({ error: "ต้องระบุสัดส่วนรายได้ใหม่" });
      }

      const updated = await updateContractShares(id, {
        memberShare: body.memberShare,
        employeeShare: body.employeeShare,
      });
      if (!updated) {
        return res.status(404).json({ error: "Contract not found" });
      }
      await logActivity(req, {
        action: "UPDATE_CONTRACT",
        targetType: "CONTRACT",
        targetId: updated.id,
        description: `แก้ไขสัดส่วนรายได้สัญญาจ้าง ${updated.pairCode} (เจ้าของสวน ${updated.memberShare}% / ลูกจ้าง ${updated.employeeShare}%)`,
      });
      return res.json(updated);
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // DELETE /api/contracts/:id — ลบได้เฉพาะสัญญาที่ถูกระงับแล้ว
  .delete(async (req, res) => {
    try {
      const { id } = req.params;
      const contract = await getContract(id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      if (contract.status !== "Inactive") {
        return res.status(400).json({ error: "ต้องระงับสัญญาก่อนจึงจะลบได้" });
      }

      await deleteContract(id);

      await logActivity(req, {
        action: "DELETE_CONTRACT",
        targetType: "CONTRACT",
        targetId: contract.id,
        description: `ลบสัญญาจ้าง ${contract.pairCode}`,
      });

      return res.json({ success: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "PATCH", "DELETE"]));

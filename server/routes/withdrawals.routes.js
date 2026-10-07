// =============================================================================
// server/routes/withdrawals.routes.js
// -----------------------------------------------------------------------------
// API การเบิกเงินสะสม (แทน app/api/withdrawals/* ของเดิม)
//
//   GET  /api/withdrawals                รายการเบิกเงินทั้งหมด
//   POST /api/withdrawals                บันทึกการเบิกเงิน
//   GET  /api/withdrawals/lookup/:code   ค้นหาสมาชิกและยอดเงินสะสมจากรหัสสมาชิก
// =============================================================================

import { Router } from "express";
import {
  WithdrawalError,
  createWithdrawal,
  getWithdrawals,
  lookupMember,
} from "../lib/data/withdrawals.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed } from "../lib/http.js";

export const withdrawalsRouter = Router();

withdrawalsRouter
  .route("/")
  // GET /api/withdrawals
  .get(async (req, res) => {
    try {
      return res.json(await getWithdrawals());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST /api/withdrawals
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      if (!body.memberCode || body.amount === undefined || body.amount === null) {
        return res
          .status(400)
          .json({ error: "กรุณากรอกรหัสสมาชิกและยอดเงินที่ต้องการเบิก" });
      }

      const withdrawal = await createWithdrawal({
        memberCode: body.memberCode,
        amount: body.amount,
      });

      await logActivity(req, {
        action: "CREATE_WITHDRAWAL",
        targetType: "WITHDRAWAL",
        targetId: withdrawal.id,
        description: `เบิกเงิน ${withdrawal.withdrawalCode} ให้ ${withdrawal.memberCode} (${withdrawal.memberName}) จำนวน ${withdrawal.amount} บาท`,
      });

      return res.status(201).json(withdrawal);
    } catch (error) {
      // เช่น ยอดเงินไม่พอ หรือสมาชิกถูกระงับ → แจ้งข้อความกลับไป
      if (error instanceof WithdrawalError) {
        return res.status(400).json({ error: error.message });
      }
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

// GET /api/withdrawals/lookup/:code
withdrawalsRouter
  .route("/lookup/:code")
  .get(async (req, res) => {
    try {
      const member = await lookupMember(decodeURIComponent(req.params.code));
      return res.json(member);
    } catch (error) {
      if (error instanceof WithdrawalError) {
        return res.status(404).json({ error: error.message });
      }
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

// =============================================================================
// server/routes/dividends.routes.js
// -----------------------------------------------------------------------------
// API การจ่ายเงินปันผล (แทน app/api/dividends/route.ts ของเดิม)
//
//   POST /api/dividends   จ่ายปันผลของปีที่เลือก
//                          body: { buddhistYear, periodLabel, rate }
// =============================================================================

import { Router } from "express";
import { DividendError, payDividend } from "../lib/data/dividends.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed } from "../lib/http.js";

export const dividendsRouter = Router();

dividendsRouter
  .route("/")
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      if (
        body.buddhistYear === undefined ||
        body.buddhistYear === null ||
        !body.periodLabel?.trim() ||
        body.rate === undefined ||
        body.rate === null
      ) {
        return res.status(400).json({
          error: "กรุณาระบุปี ช่วงเวลา และอัตราเงินปันผลให้ครบถ้วน",
        });
      }

      const payments = await payDividend({
        buddhistYear: body.buddhistYear,
        periodLabel: body.periodLabel,
        rate: body.rate,
      });

      // ยอดรวมที่จ่ายทั้งหมด สำหรับเขียนลง log
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      await logActivity(req, {
        action: "CREATE_DIVIDEND",
        targetType: "DIVIDEND",
        description: `จ่ายเงินปันผลประจำปี ${body.buddhistYear} (${
          body.periodLabel
        }) อัตรา ${body.rate} บาท/กก. ให้สมาชิก ${
          payments.length
        } ราย รวม ${totalAmount} บาท`,
      });

      return res.status(201).json(payments);
    } catch (error) {
      if (error instanceof DividendError) {
        return res.status(400).json({ error: error.message });
      }
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["POST"]));

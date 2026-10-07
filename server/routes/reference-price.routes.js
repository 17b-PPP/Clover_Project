// =============================================================================
// server/routes/reference-price.routes.js
// -----------------------------------------------------------------------------
// API ราคากลางประจำวัน (แทน app/api/reference-price/route.ts ของเดิม)
//
//   GET  /api/reference-price?date=YYYY-MM-DD   ราคากลางของวันที่ระบุ
//        (หน้ารับซื้อเรียกซ้ำทุก 15 วินาที เพื่อให้ราคาที่ผู้ดูแลแก้ไข
//         ไปปรากฏที่หน้ารับซื้อทันทีโดยไม่ต้องรีเฟรช)
//   POST /api/reference-price                    บันทึกราคากลาง { date, price }
// =============================================================================

import { Router } from "express";
import {
  getReferencePriceForDate,
  upsertReferencePrice,
} from "../lib/data/reference-price.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed, queryParam } from "../lib/http.js";
import { formatDateUtc } from "../../shared/format.js";

export const referencePriceRouter = Router();

referencePriceRouter
  .route("/")
  // GET — คืน { price: ตัวเลข หรือ null ถ้ายังไม่ได้ตั้งราคา }
  .get(async (req, res) => {
    try {
      const date = queryParam(req, "date");
      if (!date || Number.isNaN(new Date(date).getTime())) {
        return res.status(400).json({ error: "กรุณาระบุวันที่ให้ถูกต้อง" });
      }
      const entry = await getReferencePriceForDate(date);
      return res.json({ price: entry?.price ?? null });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST — บันทึก/แก้ไขราคาของวัน แล้วคืนข้อมูลราคา + แถวประวัติที่เพิ่งเพิ่ม
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      if (!body.date || body.price === undefined || body.price === null) {
        return res.status(400).json({ error: "กรุณากรอกวันที่และราคาให้ครบถ้วน" });
      }
      if (Number.isNaN(new Date(body.date).getTime())) {
        return res.status(400).json({ error: "รูปแบบวันที่ไม่ถูกต้อง" });
      }
      if (typeof body.price !== "number" || body.price <= 0) {
        return res
          .status(400)
          .json({ error: "ราคากลางต้องเป็นตัวเลขที่มากกว่า 0" });
      }

      const { entry, log } = await upsertReferencePrice(body.date, body.price);

      await logActivity(req, {
        action: "UPDATE_REFERENCE_PRICE",
        targetType: "REFERENCE_PRICE",
        targetId: entry.id,
        description: `บันทึกราคากลางประจำวันที่ ${formatDateUtc(entry.date)} เป็น ${entry.price} บาท/กก.`,
      });

      return res.status(200).json({ ...entry, log });
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

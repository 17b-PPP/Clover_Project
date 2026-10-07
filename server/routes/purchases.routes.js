// =============================================================================
// server/routes/purchases.routes.js
// -----------------------------------------------------------------------------
// API การรับซื้อน้ำยาง (แทน app/api/purchases/* ของเดิม)
//
//   GET  /api/purchases                 รายการรับซื้อทั้งหมด
//   POST /api/purchases                 บันทึกการรับซื้อใหม่
//   GET  /api/purchases/lookup/:code    ค้นหาผู้ขายจากรหัสสมาชิก/ลูกจ้าง
//                                       (?memberId=... = เจ้าของสวนที่เลือกไว้)
// =============================================================================

import { Router } from "express";
import {
  SellerLookupError,
  createPurchase,
  getPurchases,
  lookupSeller,
} from "../lib/data/purchases.js";
import { handleRouteError } from "../lib/api-error.js";
import { logActivity } from "../lib/activity-log.js";
import { readJsonBody } from "../lib/request-body.js";
import { methodNotAllowed, queryParam } from "../lib/http.js";

export const purchasesRouter = Router();

// ฟิลด์ที่ต้องกรอกเมื่อบันทึกการรับซื้อ
const REQUIRED_FIELDS = [
  "recordDate",
  "marketPrice",
  "sellerCode",
  "rawWeightKg",
  "dryPercentage",
];

purchasesRouter
  .route("/")
  // GET /api/purchases
  .get(async (req, res) => {
    try {
      return res.json(await getPurchases());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  // POST /api/purchases — ตรวจข้อมูล แล้วบันทึกการรับซื้อ + log
  .post(async (req, res) => {
    try {
      const body = readJsonBody(req);

      const missing = REQUIRED_FIELDS.filter(
        (field) =>
          body[field] === undefined || body[field] === null || body[field] === ""
      );
      if (missing.length > 0) {
        return res.status(400).json({
          error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missing.join(", ")}`,
        });
      }

      if (body.marketPrice <= 0 || body.rawWeightKg <= 0) {
        return res
          .status(400)
          .json({ error: "ราคากลางและน้ำหนักน้ำยางสดต้องมากกว่า 0" });
      }
      if (body.dryPercentage <= 0 || body.dryPercentage > 100) {
        return res
          .status(400)
          .json({ error: "เนื้อยางแห้งต้องอยู่ระหว่าง 0-100%" });
      }

      const purchase = await createPurchase({
        recordDate: body.recordDate,
        marketPrice: body.marketPrice,
        sellerCode: body.sellerCode,
        rawWeightKg: body.rawWeightKg,
        dryPercentage: body.dryPercentage,
        memberId: body.memberId,
      });

      await logActivity(req, {
        action: "CREATE_PURCHASE",
        targetType: "PURCHASE",
        targetId: purchase.id,
        description: `บันทึกรับซื้อน้ำยาง ${purchase.purchaseCode} จาก ${purchase.sellerCode} (${purchase.deliveredByName}) น้ำหนักยางแห้ง ${purchase.dryWeightKg} กก. รวม ${purchase.totalAmount} บาท`,
      });

      return res.status(201).json(purchase);
    } catch (error) {
      // ผู้ขายไม่ถูกต้อง/ถูกระงับ → แจ้งข้อความกลับไปให้ผู้ใช้เห็น
      if (error instanceof SellerLookupError) {
        return res.status(400).json({ error: error.message });
      }
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET", "POST"]));

// GET /api/purchases/lookup/:code
purchasesRouter
  .route("/lookup/:code")
  .get(async (req, res) => {
    try {
      const preferredMemberId = queryParam(req, "memberId") ?? undefined;
      const seller = await lookupSeller(
        decodeURIComponent(req.params.code),
        preferredMemberId
      );
      return res.json(seller);
    } catch (error) {
      if (error instanceof SellerLookupError) {
        return res.status(404).json({ error: error.message });
      }
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

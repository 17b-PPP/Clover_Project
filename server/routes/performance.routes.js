// =============================================================================
// server/routes/performance.routes.js
// -----------------------------------------------------------------------------
// API ดาวน์โหลดรายงานผลประกอบการเป็นไฟล์ Excel
// (แทน app/api/performance/purchase-summary/export/route.ts ของเดิม)
//
//   GET /api/performance/purchase-summary/export?from=YYYY-MM-DD&to=YYYY-MM-DD
//   → ไฟล์ .xlsx ของรายการรับซื้อในช่วงวันที่ที่เลือก (ไม่ใส่ = ทั้งหมด)
// =============================================================================

import { Router } from "express";
import { getPurchaseSummaryRows } from "../lib/data/purchase-summary.js";
import { buildPurchaseSummaryWorkbook } from "../lib/export/purchase-summary-workbook.js";
import { handleRouteError } from "../lib/api-error.js";
import { methodNotAllowed, queryParam } from "../lib/http.js";

export const performanceRouter = Router();

performanceRouter
  .route("/purchase-summary/export")
  .get(async (req, res) => {
    try {
      const from = queryParam(req, "from") ?? "";
      const to = queryParam(req, "to") ?? "";

      // กรองเฉพาะรายการที่วันทำการอยู่ในช่วงที่เลือก
      const rows = (await getPurchaseSummaryRows()).filter((row) => {
        const day = row.recordDate.slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
      });

      const workbook = await buildPurchaseSummaryWorkbook(rows, { from, to });

      // ตั้งชื่อไฟล์ 2 แบบ: ภาษาอังกฤษ (สำรองสำหรับเบราว์เซอร์เก่า) และภาษาไทย
      const stamp = new Date().toISOString().slice(0, 10);
      const asciiName = `purchase-performance-${stamp}.xlsx`;
      const thaiName = `รายงานผลประกอบการรับซื้อน้ำยางสด_${stamp}.xlsx`;

      res.status(200);
      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          thaiName
        )}`,
        "Cache-Control": "no-store",
      });
      return res.send(Buffer.from(workbook));
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

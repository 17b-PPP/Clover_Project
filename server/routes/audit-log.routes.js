// =============================================================================
// server/routes/audit-log.routes.js
// -----------------------------------------------------------------------------
// API ประวัติการใช้งาน (แทน app/api/audit-log/route.ts ของเดิม) — เฉพาะผู้ดูแลระบบ
//
//   GET /api/audit-log   ประวัติการใช้งาน 200 รายการล่าสุด
// =============================================================================

import { Router } from "express";
import { getAuditLogs } from "../lib/data/audit-log.js";
import { handleRouteError } from "../lib/api-error.js";
import { methodNotAllowed } from "../lib/http.js";

export const auditLogRouter = Router();

auditLogRouter
  .route("/")
  .get(async (req, res) => {
    try {
      return res.json(await getAuditLogs());
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

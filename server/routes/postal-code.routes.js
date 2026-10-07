// =============================================================================
// server/routes/postal-code.routes.js
// -----------------------------------------------------------------------------
// API ค้นหาอำเภอ/จังหวัดจากรหัสไปรษณีย์ (แทน app/api/postal-code/[code] ของเดิม)
//
//   GET /api/postal-code/:code   → [{ amphoe, province }, ...]
// =============================================================================

import { Router } from "express";
import { lookupPostalCode } from "../lib/thai-address.js";
import { handleRouteError } from "../lib/api-error.js";
import { methodNotAllowed } from "../lib/http.js";

export const postalCodeRouter = Router();

postalCodeRouter
  .route("/:code")
  .get((req, res) => {
    try {
      return res.json(lookupPostalCode(req.params.code));
    } catch (error) {
      return handleRouteError(res, error);
    }
  })
  .all(methodNotAllowed(["GET"]));

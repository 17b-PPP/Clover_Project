// =============================================================================
// server/routes/api.routes.js
// -----------------------------------------------------------------------------
// รวม API ทุกเส้นไว้ใต้ /api (server.js นำ router นี้ไปใช้ที่ /api)
// =============================================================================

import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { memberAuthRouter } from "./member-auth.routes.js";
import { membersRouter } from "./members.routes.js";
import { employeesRouter } from "./employees.routes.js";
import { usersRouter } from "./users.routes.js";
import { contractsRouter } from "./contracts.routes.js";
import { purchasesRouter } from "./purchases.routes.js";
import { withdrawalsRouter } from "./withdrawals.routes.js";
import { dividendsRouter } from "./dividends.routes.js";
import { auditLogRouter } from "./audit-log.routes.js";
import { referencePriceRouter } from "./reference-price.routes.js";
import { postalCodeRouter } from "./postal-code.routes.js";
import { performanceRouter } from "./performance.routes.js";
import { pageDataRouter } from "./page-data.routes.js";
import { memberPortalRouter } from "./member-portal.routes.js";

export const apiRouter = Router();

// API เดิมของโปรเจค (ชื่อเส้นทางเหมือนเดิมทุกเส้น)
apiRouter.use("/auth", authRouter);
apiRouter.use("/member-auth", memberAuthRouter);
apiRouter.use("/members", membersRouter);
apiRouter.use("/employees", employeesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/contracts", contractsRouter);
apiRouter.use("/purchases", purchasesRouter);
apiRouter.use("/withdrawals", withdrawalsRouter);
apiRouter.use("/dividends", dividendsRouter);
apiRouter.use("/audit-log", auditLogRouter);
apiRouter.use("/reference-price", referencePriceRouter);
apiRouter.use("/postal-code", postalCodeRouter);
apiRouter.use("/performance", performanceRouter);

// API ใหม่ที่ส่งข้อมูลเริ่มต้นของแต่ละหน้า (แทนการดึงข้อมูลใน page.tsx เดิม)
apiRouter.use("/page-data", pageDataRouter);
apiRouter.use("/member-portal", memberPortalRouter);

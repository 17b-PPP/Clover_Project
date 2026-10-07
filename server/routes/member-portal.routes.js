// =============================================================================
// server/routes/member-portal.routes.js
// -----------------------------------------------------------------------------
// API "ข้อมูลของแต่ละหน้า" ในพอร์ทัลสมาชิก
// (แทนการดึงข้อมูลใน page.tsx และ MemberTopbar ของ Next.js เดิม)
//
//   GET /api/member-portal/dashboard   ← app/(member)/member/(portal)/dashboard/page.tsx
//   GET /api/member-portal/finance     ← app/(member)/member/(portal)/finance/page.tsx
//   GET /api/member-portal/sales       ← app/(member)/member/(portal)/sales/page.tsx
//
// ทุกเส้นคืน:
//   portal        : { memberId, profile, marketPrice, fetchedAt } (ใช้ทำแถบด้านบน)
//   notifications : รายการแจ้งเตือนสำหรับกระดิ่ง
//   + ข้อมูลเฉพาะของหน้านั้น
//
// ถ้าไม่มี session หรือสมาชิกถูกระงับ จะตอบ 401 พร้อม { redirect: "<URL>" }
// แล้ว JavaScript ฝั่งหน้าเว็บจะพาผู้ใช้ไปที่ URL นั้น
// =============================================================================

import { Router } from "express";
import { handleRouteError } from "../lib/api-error.js";
import { methodNotAllowed } from "../lib/http.js";
import {
  PortalRedirect,
  getMemberEmployeeInfo,
  getMemberFinanceHistory,
  getMemberNotifications,
  getMemberWalletMonthlySummary,
  requireMemberPortal,
} from "../lib/data/member-portal.js";
import { getPurchaseHistoryForMember } from "../lib/data/purchases.js";

export const memberPortalRouter = Router();

// ตัวช่วยลงทะเบียน route ของพอร์ทัล:
// ตรวจสมาชิกก่อน (requireMemberPortal) แล้วจึงเรียก loader ของหน้านั้น
function portalData(path, loader) {
  memberPortalRouter
    .route(path)
    .get(async (req, res) => {
      try {
        const portal = await requireMemberPortal(req);
        const [notifications, pageData] = await Promise.all([
          getMemberNotifications(portal.memberId),
          loader(portal.memberId),
        ]);
        return res.json({ portal, notifications, ...pageData });
      } catch (error) {
        if (error instanceof PortalRedirect) {
          return res
            .status(401)
            .json({ error: "Unauthorized", redirect: error.location });
        }
        return handleRouteError(res, error);
      }
    })
    .all(methodNotAllowed(["GET"]));
}

// หน้าหลักของสมาชิก: การ์ดกระเป๋าเงิน, ลูกจ้าง, ภาพรวมการขาย/การเงิน/ปันผล
portalData("/dashboard", async (memberId) => {
  const [walletSummary, entries, employees] = await Promise.all([
    getMemberWalletMonthlySummary(memberId),
    getMemberFinanceHistory(memberId),
    getMemberEmployeeInfo(memberId),
  ]);
  return { walletSummary, entries, employees };
});

// หน้าประวัติทางการเงิน
portalData("/finance", async (memberId) => {
  const [entries, walletSummary] = await Promise.all([
    getMemberFinanceHistory(memberId),
    getMemberWalletMonthlySummary(memberId),
  ]);
  return { entries, walletSummary };
});

// หน้าประวัติการขาย
portalData("/sales", async (memberId) => ({
  purchases: await getPurchaseHistoryForMember(memberId),
}));

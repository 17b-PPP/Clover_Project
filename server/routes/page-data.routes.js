// =============================================================================
// server/routes/page-data.routes.js
// -----------------------------------------------------------------------------
// API "ข้อมูลเริ่มต้นของแต่ละหน้า" ฝั่งพนักงาน
//
// เดิมไฟล์ page.tsx ของ Next.js ดึงข้อมูลจากฐานข้อมูลบนเซิร์ฟเวอร์ แล้วส่งให้
// ส่วนแสดงผลตอนสร้างหน้า แต่หน้า HTML ธรรมดาทำแบบนั้นไม่ได้ จึงย้ายมาเป็น API:
// หน้าเว็บโหลด HTML เสร็จแล้ว JavaScript จะเรียก API เหล่านี้เพื่อเอาข้อมูลมาแสดง
//
// เส้นทางแต่ละเส้นตรงกับ page.tsx เดิม 1 ต่อ 1 และคืนข้อมูลชุดเดียวกัน:
//   GET /api/page-data/app-layout        ← app/(app)/layout.tsx
//   GET /api/page-data/members           ← app/(app)/members/page.tsx
//   GET /api/page-data/employees         ← app/(app)/employees/page.tsx
//   GET /api/page-data/contracts         ← app/(app)/contracts/page.tsx
//   GET /api/page-data/purchases         ← app/(app)/purchases/page.tsx
//   GET /api/page-data/withdrawals       ← app/(app)/withdrawals/page.tsx
//   GET /api/page-data/reference-price   ← app/(app)/reference-price/page.tsx
//   GET /api/page-data/dividends         ← app/(app)/dividends/page.tsx
//   GET /api/page-data/purchase-summary  ← app/(app)/performance/purchase-summary/page.tsx
//   GET /api/page-data/users             ← app/(app)/users/page.tsx      (เฉพาะ ADMIN)
//   GET /api/page-data/audit-log         ← app/(app)/audit-log/page.tsx  (เฉพาะ ADMIN)
//
// ทุกเส้นต้องเข้าสู่ระบบก่อน (access-guard ตรวจให้)
// =============================================================================

import { Router } from "express";
import { handleRouteError } from "../lib/api-error.js";
import { methodNotAllowed } from "../lib/http.js";
import { loadAppLayoutData } from "../lib/layout-data.js";
import { getMembers, getMemberOptions } from "../lib/data/members.js";
import { getEmployees, getEmployeeOptions } from "../lib/data/employees.js";
import { getContracts } from "../lib/data/contracts.js";
import { getReferencePriceForDate, getReferencePriceLog } from "../lib/data/reference-price.js";
import { getDividendData } from "../lib/data/dividends.js";
import { getPurchaseSummaryRows } from "../lib/data/purchase-summary.js";
import { getWithdrawals } from "../lib/data/withdrawals.js";
import { getUsers } from "../lib/data/users.js";
import { getAuditLogs } from "../lib/data/audit-log.js";

export const pageDataRouter = Router();

// ตัวช่วยลงทะเบียน GET route: เรียก loader แล้วส่งผลลัพธ์เป็น JSON
// ถ้าเกิด error จะตอบ 500 ผ่าน handleRouteError
function pageData(path, loader) {
  pageDataRouter
    .route(path)
    .get(async (req, res) => {
      try {
        return res.json(await loader(req));
      } catch (error) {
        return handleRouteError(res, error);
      }
    })
    .all(methodNotAllowed(["GET"]));
}

// วันที่ "วันนี้" ตามเวลาประเทศไทย ในรูปแบบ YYYY-MM-DD
// (ราคากลางถูกตั้งตามวันของไทย จึงต้องใช้วันที่ไทย ไม่ใช่ UTC)
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function bangkokToday() {
  return bangkokDateFormatter.format(new Date());
}

// ข้อมูลเมนูด้านซ้าย (ใช้โหลดซ้ำหลังเปลี่ยนรหัสผ่าน)
pageData("/app-layout", (req) => loadAppLayoutData(req));

// หน้าการจัดการสมาชิก
pageData("/members", async () => ({
  initialMembers: await getMembers(),
}));

// หน้าการจัดการลูกจ้าง (ใช้สัญญาจ้างแสดงสัดส่วนรายได้ในหน้าต่างข้อมูลลูกจ้าง)
pageData("/employees", async () => {
  const [employees, contracts] = await Promise.all([
    getEmployees(),
    getContracts(),
  ]);
  return { initialEmployees: employees, contracts };
});

// หน้าสัญญาจ้าง (ต้องใช้รายชื่อสมาชิกและลูกจ้างสำหรับช่องเลือก)
pageData("/contracts", async () => {
  const [contracts, members, employees] = await Promise.all([
    getContracts(),
    getMemberOptions(),
    getEmployeeOptions(),
  ]);
  return { initialContracts: contracts, members, employees };
});

// หน้ารับซื้อน้ำยาง:
//   - sellerOptions      : สมาชิกและลูกจ้างที่ใช้งานอยู่ สำหรับช่องค้นหาผู้ขาย
//   - initialMarketPrice : ราคากลางของวันนี้ (ข้อความ) หรือ null ถ้ายังไม่ได้ตั้ง
pageData("/purchases", async () => {
  const today = bangkokToday();
  const [members, employees, referencePrice] = await Promise.all([
    getMemberOptions(),
    getEmployeeOptions(),
    getReferencePriceForDate(today),
  ]);

  const sellerOptions = [
    ...members
      .filter((m) => m.status === "Active")
      .map((m) => ({
        code: m.memberCode,
        name: `${m.firstName} ${m.lastName}`,
        kind: "member",
      })),
    ...employees
      .filter((e) => e.status === "Active")
      .map((e) => ({
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        kind: "employee",
      })),
  ];

  return {
    sellerOptions,
    initialMarketPrice: referencePrice ? String(referencePrice.price) : null,
  };
});

// หน้าเบิกเงิน:
//   - memberOptions : สมาชิกที่ใช้งานอยู่ ในรูปแบบ { value, label } สำหรับช่องค้นหา
//   - withdrawals   : รายการเบิกเงินทั้งหมด (ใหม่สุดก่อน) สำหรับตารางประวัติการเบิกเงิน
pageData("/withdrawals", async () => {
  const [members, withdrawals] = await Promise.all([
    getMemberOptions(),
    getWithdrawals(),
  ]);
  const memberOptions = members
    .filter((m) => m.status === "Active")
    .map((m) => ({
      value: m.memberCode,
      label: `${m.memberCode} · ${m.firstName} ${m.lastName}`,
    }));
  return { memberOptions, withdrawals };
});

// หน้าราคากลางประจำวัน: ประวัติการบันทึกราคาทั้งหมด
pageData("/reference-price", async () => ({
  initialLog: await getReferencePriceLog(),
}));

// หน้าคำนวณเงินปันผล
pageData("/dividends", async () => ({
  data: await getDividendData(),
}));

// หน้าผลประกอบการรับซื้อน้ำยาง: รายการรับซื้อทั้งหมด + รายการเบิกเงินทั้งหมด
pageData("/purchase-summary", async () => {
  const [rows, withdrawals] = await Promise.all([
    getPurchaseSummaryRows(),
    getWithdrawals(),
  ]);
  return { rows, withdrawals };
});

// หน้าตรวจสอบสิทธิ์ผู้ใช้งาน (เฉพาะผู้ดูแลระบบ)
pageData("/users", async () => ({
  initialUsers: await getUsers(),
}));

// หน้าประวัติการใช้งาน (เฉพาะผู้ดูแลระบบ)
pageData("/audit-log", async () => ({
  entries: await getAuditLogs(),
}));

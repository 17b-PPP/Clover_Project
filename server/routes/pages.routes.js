// =============================================================================
// server/routes/pages.routes.js
// -----------------------------------------------------------------------------
// ส่งหน้าเว็บ HTML ให้เบราว์เซอร์ (แทนระบบ routing ของหน้าใน Next.js)
//
// การทำงาน:
//   1. จับคู่ URL กับไฟล์ HTML ในโฟลเดอร์ pages/  เช่น /members → members.html
//   2. รวมไฟล์ย่อยที่ใช้ซ้ำหลายหน้า (โฟลเดอร์ pages/partials/) เข้าไปในหน้า
//      ตามคำสั่ง  <!-- @include partials/ชื่อไฟล์.html -->
//   3. ฝัง "ข้อมูลโครงหน้า" (ข้อมูลเมนูด้านซ้าย) ลงในหน้าเป็น JSON
//      ตรงตำแหน่ง  @@LAYOUT_DATA@@  เพื่อให้เมนูแสดงครบทันทีที่หน้าเปิด
//      (เหมือน layout.tsx เดิมที่สร้างเมนูบนเซิร์ฟเวอร์)
//
// ข้อมูลหลักของแต่ละหน้า (ตาราง ฟอร์ม ฯลฯ) ไม่ได้ฝังตรงนี้ — JavaScript ของหน้านั้น
// จะเรียก /api/page-data/... หรือ /api/member-portal/... เอง
// =============================================================================

import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppLayoutData } from "../lib/layout-data.js";
import { PortalRedirect, requireMemberPortal } from "../lib/data/member-portal.js";

export const pagesRouter = Router();

// โฟลเดอร์ pages/ ของโปรเจค
const PAGES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "pages"
);

// ตอนรันแบบ production จะเก็บ HTML ที่รวมไฟล์ย่อยแล้วไว้ในหน่วยความจำ
// ตอน development อ่านไฟล์ใหม่ทุกครั้ง เพื่อให้แก้ HTML แล้วรีเฟรชเห็นผลทันที
const pageCache = new Map();

// อ่านไฟล์ HTML แล้วแทนที่คำสั่ง <!-- @include ... --> ด้วยเนื้อหาไฟล์ย่อย
// (ไฟล์ย่อยเรียก include ต่อได้อีก)
async function readWithIncludes(relativePath) {
  const html = await fs.readFile(path.join(PAGES_DIR, relativePath), "utf8");
  const pattern = /<!--\s*@include\s+([\w\-./]+)\s*-->/g;
  const parts = [];
  let lastIndex = 0;
  for (const match of html.matchAll(pattern)) {
    parts.push(html.slice(lastIndex, match.index));
    parts.push(await readWithIncludes(match[1]));
    lastIndex = match.index + match[0].length;
  }
  parts.push(html.slice(lastIndex));
  return parts.join("");
}

// โหลดหน้า HTML ที่รวมไฟล์ย่อยแล้ว (ใช้ cache ตอน production)
async function loadPage(fileName) {
  if (process.env.NODE_ENV === "production" && pageCache.has(fileName)) {
    return pageCache.get(fileName);
  }
  const html = await readWithIncludes(fileName);
  if (process.env.NODE_ENV === "production") pageCache.set(fileName, html);
  return html;
}

// แปลงข้อมูลเป็น JSON ที่ฝังใน <script> ได้อย่างปลอดภัย
// (แปลงอักขระ "<" และตัวขึ้นบรรทัดพิเศษ U+2028/U+2029 เป็นรหัส escape เพื่อไม่ให้
//  ข้อความอย่าง "</script>" ปิดแท็กก่อนเวลา และไม่ให้ JavaScript อ่านผิด)
function toSafeJson(data) {
  const backslash = String.fromCharCode(92);
  return JSON.stringify(data)
    .replace(/</g, backslash + "u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), backslash + "u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), backslash + "u2029");
}

// ส่งหน้า HTML ให้เบราว์เซอร์ (ไม่ให้ cache เพราะมีข้อมูลผู้ใช้ฝังอยู่)
async function sendPage(res, fileName, layoutData, status = 200) {
  let html = await loadPage(fileName);
  if (layoutData !== undefined) {
    html = html.replace("@@LAYOUT_DATA@@", () => toSafeJson(layoutData));
  }
  res
    .status(status)
    .set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate")
    .type("html")
    .send(html);
}

// ส่งหน้า 404 (ไม่พบหน้าที่ต้องการ)
export async function sendNotFound(res) {
  await sendPage(res, "404.html", undefined, 404);
}

// ---------------------------------------------------------------------------
// หน้าแรก "/" → พาไปหน้าการจัดการสมาชิก (เหมือน app/(app)/page.tsx เดิม)
// ---------------------------------------------------------------------------
pagesRouter.get("/", (req, res) => res.redirect(307, "/members"));

// ---------------------------------------------------------------------------
// หน้าเข้าสู่ระบบ (ไม่มีเมนูด้านซ้าย)
// ---------------------------------------------------------------------------
pagesRouter.get("/login", (req, res, next) =>
  sendPage(res, "login.html").catch(next)
);
pagesRouter.get("/member/login", (req, res, next) =>
  sendPage(res, "member-login.html").catch(next)
);

// ---------------------------------------------------------------------------
// หน้าของพนักงาน (มีเมนูด้านซ้าย — ฝังข้อมูลผู้ใช้สำหรับเมนูลงในหน้า)
// ---------------------------------------------------------------------------
const STAFF_PAGES = {
  "/members": "members.html",
  "/employees": "employees.html",
  "/contracts": "contracts.html",
  "/purchases": "purchases.html",
  "/withdrawals": "withdrawals.html",
  "/reference-price": "reference-price.html",
  "/dividends": "dividends.html",
  "/performance/purchase-summary": "purchase-summary.html",
  "/users": "users.html",
  "/audit-log": "audit-log.html",
};

for (const [route, fileName] of Object.entries(STAFF_PAGES)) {
  pagesRouter.get(route, async (req, res, next) => {
    try {
      const layoutData = await loadAppLayoutData(req);
      await sendPage(res, fileName, layoutData);
    } catch (error) {
      next(error);
    }
  });
}

// ---------------------------------------------------------------------------
// หน้าของพอร์ทัลสมาชิก
// ตรวจสถานะสมาชิกก่อนส่งหน้า (เหมือน layout ของพอร์ทัลเดิม):
// ถ้าสมาชิกถูกระงับระหว่างใช้งาน จะถูกพาไปออกจากระบบทันที
// ---------------------------------------------------------------------------
const MEMBER_PAGES = {
  "/member/dashboard": "member-dashboard.html",
  "/member/finance": "member-finance.html",
  "/member/sales": "member-sales.html",
};

for (const [route, fileName] of Object.entries(MEMBER_PAGES)) {
  pagesRouter.get(route, async (req, res, next) => {
    try {
      const { profile } = await requireMemberPortal(req);
      await sendPage(res, fileName, { profile });
    } catch (error) {
      if (error instanceof PortalRedirect) {
        return res.redirect(307, error.location);
      }
      next(error);
    }
  });
}

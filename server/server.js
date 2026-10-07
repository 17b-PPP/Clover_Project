// =============================================================================
// server/server.js
// -----------------------------------------------------------------------------
// จุดเริ่มต้นของเว็บเซิร์ฟเวอร์ (Node.js + Express) — ทำหน้าที่แทน Next.js
//
// ลำดับการจัดการ request:
//   1. ไฟล์คงที่ (CSS, JavaScript, ฟอนต์, favicon) จากโฟลเดอร์ public/
//      และไฟล์ JS ที่ใช้ร่วมกันจากโฟลเดอร์ shared/  → ส่งได้ทันที ไม่ต้องตรวจสิทธิ์
//   2. อ่าน body ของ request ที่ส่งมาที่ /api (เก็บเป็นข้อความไว้ให้ API แปลงเป็น JSON)
//   3. ตรวจสิทธิ์การเข้าถึง (access-guard = proxy.ts เดิม)
//   4. API ทั้งหมดใต้ /api
//   5. หน้าเว็บ HTML
//   6. ไม่ตรงกับอะไรเลย → หน้า 404
//
// วิธีรัน:  npm run dev   (โหมดพัฒนา รีสตาร์ตอัตโนมัติเมื่อแก้โค้ดฝั่งเซิร์ฟเวอร์)
//          npm start     (โหมด production)
// =============================================================================

import "./env.js"; // ต้องอยู่บรรทัดแรก เพื่อกำหนด NODE_ENV ก่อนโมดูลอื่น
import express from "express";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessGuard } from "./middleware/access-guard.js";
import { apiRouter } from "./routes/api.routes.js";
import { pagesRouter, sendNotFound } from "./routes/pages.routes.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable("x-powered-by");

// 1) ไฟล์คงที่
app.use(express.static(path.join(projectRoot, "public"), { index: false }));
app.use("/shared", express.static(path.join(projectRoot, "shared"), { index: false }));

// 2) อ่าน body ของ API เป็นข้อความดิบ (รองรับรูปถ่ายแบบ base64 ขนาดใหญ่ได้)
app.use("/api", express.text({ type: () => true, limit: "50mb" }));

// 3) ตรวจสิทธิ์
app.use(accessGuard);

// 4) API
app.use("/api", apiRouter);

// 5) หน้าเว็บ
app.use(pagesRouter);

// 6) ไม่พบหน้า
app.use((req, res, next) => {
  sendNotFound(res).catch(next);
});

// ตัวจัดการ error สุดท้าย (เช่น อ่านไฟล์ไม่ได้ หรือ body ใหญ่เกินกำหนด)
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.status || error.statusCode || 500;
  if (req.path.startsWith("/api")) {
    return res.status(status).json({ error: error.message || "Internal server error" });
  }
  return res.status(status).type("text").send("Internal Server Error");
});

// หา IP ของเครื่องในวง LAN เพื่อแสดงลิงก์ให้เปิดจากมือถือ/แท็บเล็ตได้
function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net.address);
}

app.listen(PORT, () => {
  console.log(`\n  Field Latex Project (HTML/CSS/JS) — โหมด ${process.env.NODE_ENV}`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  for (const address of lanAddresses()) {
    console.log(`  - Network: http://${address}:${PORT}`);
  }
  console.log("");
});

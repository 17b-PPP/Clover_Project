// =============================================================================
// scripts/build-vendor.js
// -----------------------------------------------------------------------------
// สคริปต์สร้างไฟล์ public/vendor/react-recharts.js
//
// การทำงาน:
//   1. ใช้ esbuild อ่าน vendor-src/react-recharts.js
//   2. รวม React, ReactDOM และ recharts (เวอร์ชันเดียวกับใน node_modules)
//      เป็นไฟล์ ES module ไฟล์เดียว แบบย่อขนาด (minify)
//   3. กำหนด process.env.NODE_ENV = "production" เพื่อใช้ React โหมด production
//
// สคริปต์นี้ถูกเรียกอัตโนมัติหลัง `npm install` (ดู "postinstall" ใน package.json)
// หรือสั่งเองได้ด้วย `npm run build:vendor`
// =============================================================================

import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

// หาตำแหน่งโฟลเดอร์โปรเจค (โฟลเดอร์แม่ของ scripts/)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(projectRoot, "vendor-src", "react-recharts.js")],
  outfile: path.join(projectRoot, "public", "vendor", "react-recharts.js"),
  bundle: true, // รวมทุกไฟล์ที่ถูก import เข้ามาเป็นไฟล์เดียว
  format: "esm", // ให้หน้าเว็บใช้ <script type="module"> / import ได้
  platform: "browser",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

console.log("สร้าง public/vendor/react-recharts.js เรียบร้อยแล้ว");

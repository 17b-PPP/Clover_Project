// =============================================================================
// vendor-src/react-recharts.js
// -----------------------------------------------------------------------------
// ไฟล์ "ต้นทาง" สำหรับรวม React + recharts ให้เป็นไฟล์เดียวที่เบราว์เซอร์โหลดได้
//
// ทำไมต้องมีไฟล์นี้:
//   - React 19 กับ recharts ที่ติดตั้งไว้ใน node_modules เป็นโค้ดสำหรับ Node.js
//     (CommonJS) หน้าเว็บ HTML ธรรมดาจึงโหลดตรง ๆ ไม่ได้
//   - scripts/build-vendor.js จะใช้ esbuild อ่านไฟล์นี้ แล้วรวมทุกอย่างเป็น
//     public/vendor/react-recharts.js (ES module ไฟล์เดียว)
//   - ไฟล์กราฟใน public/js/charts/ จะ import ของจากไฟล์ที่รวมแล้วนั้นอีกที
//
// React ถูกใช้ "เฉพาะกราฟ" เท่านั้น ส่วนอื่นของเว็บเป็น HTML/CSS/JS ธรรมดาทั้งหมด
// =============================================================================

import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ส่งออกเฉพาะส่วนที่กราฟทั้ง 3 ตัวใช้จริง
export {
  React,
  createRoot,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
};

// =============================================================================
// server/env.js
// -----------------------------------------------------------------------------
// กำหนดโหมดการทำงานของเซิร์ฟเวอร์ (development / production)
//
// เดิม Next.js ตั้งค่า NODE_ENV ให้เอง:
//   - `next dev`   → NODE_ENV = "development"
//   - `next start` → NODE_ENV = "production"
// เวอร์ชันนี้ใช้คำสั่ง `npm run dev` / `npm start` แทน โดย `npm start`
// จะส่ง flag --production มา ไฟล์นี้จึงแปลง flag นั้นเป็นค่า NODE_ENV
//
// ไฟล์นี้ต้องถูก import เป็นอันดับแรกใน server.js เพื่อให้ทุกโมดูลที่โหลด
// ตามมาเห็นค่า NODE_ENV ที่ถูกต้อง (เช่น การตั้งค่า cookie แบบ secure)
// =============================================================================

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = process.argv.includes("--production")
    ? "production"
    : "development";
}

export const isProduction = process.env.NODE_ENV === "production";

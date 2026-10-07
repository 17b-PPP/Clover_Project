// =============================================================================
// server/lib/prisma.js
// -----------------------------------------------------------------------------
// สร้างตัวเชื่อมต่อฐานข้อมูล (PrismaClient) เพียงตัวเดียวให้ทั้งเซิร์ฟเวอร์ใช้ร่วมกัน
//
// - ตอน development เก็บตัวเชื่อมต่อไว้ใน globalThis เพื่อไม่ให้สร้างใหม่ซ้ำ
//   หลายตัว (เหมือนโค้ดเดิมของ Next.js)
// - ค่าการเชื่อมต่อ (DATABASE_URL, DIRECT_URL) อ่านจากไฟล์ .env
//   ตามที่กำหนดไว้ใน prisma/schema.prisma
// =============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

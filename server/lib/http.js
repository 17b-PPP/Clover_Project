// =============================================================================
// server/lib/http.js
// -----------------------------------------------------------------------------
// ตัวช่วยเล็ก ๆ เกี่ยวกับ HTTP ที่ใช้ร่วมกันในทุก route
// =============================================================================

import { Prisma } from "@prisma/client";

// ใช้ต่อท้าย route เพื่อตอบ 405 (Method Not Allowed) เมื่อเรียกด้วย method
// ที่ route นั้นไม่รองรับ — เหมือนที่ Next.js ทำเมื่อไฟล์ route ไม่มีฟังก์ชันของ method นั้น
// ตัวอย่าง: router.route("/x").get(...).all(methodNotAllowed(["GET"]))
export function methodNotAllowed(allowed) {
  return (req, res) => {
    res.set("Allow", allowed.join(", "));
    res.status(405).end();
  };
}

// อ่านค่า query string ตามชื่อ (เช่น ?date=2026-10-07) — คืน null ถ้าไม่มี
// ถ้าชื่อเดียวกันส่งมาหลายครั้ง จะใช้ค่าแรก (เหมือน searchParams.get() ของเดิม)
export function queryParam(req, name) {
  const value = req.query[name];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
}

// ตรวจว่า error มาจาก Prisma และมีรหัสตามที่ระบุหรือไม่
//   P2002 = ข้อมูลซ้ำกับที่มีอยู่ (unique)
//   P2003 = ลบไม่ได้เพราะมีข้อมูลอื่นอ้างอิงอยู่ (foreign key)
//   P2025 = ไม่พบข้อมูลที่จะแก้ไข/ลบ
export function isPrismaError(error, code) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

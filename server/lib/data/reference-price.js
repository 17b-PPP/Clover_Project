// =============================================================================
// server/lib/data/reference-price.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการ "ราคากลางประจำวัน"
//
// มี 2 ตาราง:
//   - ReferencePrice        : 1 วันมี 1 ราคา (บันทึกซ้ำวันเดิม = แก้ไขราคาวันนั้น)
//   - ReferencePriceHistory : ประวัติทุกครั้งที่กดบันทึก (เพิ่มอย่างเดียว ไม่ลบ/ไม่แก้)
// วันที่เก็บเป็นเที่ยงคืน UTC ของวันนั้น (แบบเดียวกับ recordDate ของการรับซื้อ)
// =============================================================================

import { prisma } from "../prisma.js";

// แปลงแถว ReferencePrice เป็นข้อมูลที่ส่งให้หน้าเว็บ
function serialize(row) {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// แปลงแถวประวัติการบันทึกราคา
function serializeLog(row) {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    recordedAt: row.recordedAt.toISOString(),
  };
}

// ราคากลางล่าสุดของทุกวัน (วันใหม่สุดก่อน)
export async function getReferencePriceHistory() {
  const rows = await prisma.referencePrice.findMany({
    orderBy: { date: "desc" },
  });
  return rows.map(serialize);
}

// ประวัติการกดบันทึกราคาทั้งหมด (ล่าสุดก่อน) — หน้าเว็บแบ่งหน้าเอง
export async function getReferencePriceLog() {
  const rows = await prisma.referencePriceHistory.findMany({
    orderBy: { recordedAt: "desc" },
  });
  return rows.map(serializeLog);
}

// ราคากลางของวันที่ระบุ (คืน null ถ้ายังไม่ได้ตั้งราคา)
export async function getReferencePriceForDate(dateIso) {
  const row = await prisma.referencePrice.findUnique({
    where: { date: new Date(dateIso) },
  });
  return row ? serialize(row) : null;
}

// บันทึกราคากลางของวันหนึ่ง (ถ้ามีอยู่แล้วจะแก้ไข ถ้าไม่มีจะเพิ่มใหม่)
// และเพิ่มแถวประวัติไปพร้อมกันใน transaction เดียว
export async function upsertReferencePrice(dateIso, price) {
  const date = new Date(dateIso);
  const [row, logRow] = await prisma.$transaction([
    prisma.referencePrice.upsert({
      where: { date },
      create: { date, price },
      update: { price },
    }),
    prisma.referencePriceHistory.create({
      data: { date, price },
    }),
  ]);
  return { entry: serialize(row), log: serializeLog(logRow) };
}

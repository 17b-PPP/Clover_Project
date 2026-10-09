// =============================================================================
// server/lib/data/dividends.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการ "เงินปันผล" ของสมาชิก
//
// หลักการ:
//   - เงินปันผลของสมาชิก = น้ำหนักยางแห้งรวมทั้งปี (พ.ศ.) × อัตราปันผล (บาท/กก.)
//   - จ่ายได้ปีละ 1 ครั้งเท่านั้น
//   - เมื่อจ่าย จะบวกเงินเข้าทั้ง walletBalance (ยอดเงินสะสมที่เบิกได้)
//     และ dividendBalance (ยอดปันผลสะสม) พร้อมบันทึกประวัติทีละคน
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// recordDate ถูกเก็บเป็นเที่ยงคืน UTC ของวันทำการ จึงอ่านปีจากส่วน UTC
// แล้ว +543 เพื่อแปลงเป็นปีพุทธศักราชที่สหกรณ์ใช้จ่ายปันผล
function buddhistYearOf(date) {
  return date.getUTCFullYear() + 543;
}

// error เฉพาะของการจ่ายปันผล (ข้อความจะแสดงให้ผู้ใช้เห็น)
export class DividendError extends Error {}

// แปลงแถว DividendPayment เป็นข้อมูลที่ส่งให้หน้าเว็บ
function serializePayment(payment) {
  return {
    id: payment.id,
    dividendCode: payment.dividendCode,
    memberId: payment.memberId,
    memberCode: payment.memberCode,
    memberName: payment.memberName,
    buddhistYear: payment.buddhistYear,
    periodLabel: payment.periodLabel,
    rate: payment.rate.toNumber(),
    dryWeightKg: payment.dryWeightKg.toNumber(),
    amount: payment.amount.toNumber(),
    balanceBefore: payment.balanceBefore.toNumber(),
    balanceAfter: payment.balanceAfter.toNumber(),
    createdAt: payment.createdAt.toISOString(),
  };
}

// สร้างเลขที่ปันผลถัดไป เช่น D-0020 → D-0021
async function nextDividendCode() {
  const last = await prisma.dividendPayment.findFirst({
    orderBy: { dividendCode: "desc" },
    select: { dividendCode: true },
  });
  const n = last ? parseInt(last.dividendCode.replace("D-", ""), 10) : 0;
  return `D-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// ข้อมูลสำหรับหน้าคำนวณปันผล:
//   - members   : รายชื่อสมาชิกทั้งหมด
//   - purchases : น้ำหนักยางแห้งของทุกการรับซื้อ พร้อมปี พ.ศ. (หน้าเว็บนำไปรวมเองตามปีที่เลือก)
//   - paidYears : ปีที่จ่ายปันผลไปแล้ว (หน้าเว็บจะล็อกไม่ให้จ่ายซ้ำ)
//   - payments  : ประวัติการจ่ายทั้งหมด (ใหม่สุดก่อน)
// ยังไม่มีอะไรถูกบันทึกจนกว่าผู้ใช้จะกด "จ่ายปันผล"
export async function getDividendData() {
  const [members, purchases, payments] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, memberCode: true, firstName: true, lastName: true },
      orderBy: { memberCode: "asc" },
    }),
    prisma.purchase.findMany({
      select: { memberId: true, dryWeightKg: true, recordDate: true },
    }),
    prisma.dividendPayment.findMany({
      orderBy: [{ createdAt: "desc" }, { dividendCode: "asc" }],
    }),
  ]);

  return {
    members: members.map((member) => ({
      memberId: member.id,
      memberCode: member.memberCode,
      memberName: `${member.firstName} ${member.lastName}`,
    })),
    purchases: purchases.map((purchase) => ({
      memberId: purchase.memberId,
      dryWeightKg: purchase.dryWeightKg.toNumber(),
      buddhistYear: buddhistYearOf(purchase.recordDate),
    })),
    paidYears: [...new Set(payments.map((payment) => payment.buddhistYear))],
    payments: payments.map(serializePayment),
  };
}

// จ่ายปันผลของปี พ.ศ. ที่เลือก ตามอัตราที่กำหนด
//
// ขั้นตอน:
//   1. ตรวจอัตราและช่วงเวลา และตรวจว่าปีนี้ยังไม่เคยจ่าย
//   2. คำนวณน้ำหนักยางแห้งของสมาชิกแต่ละคนใหม่ที่เซิร์ฟเวอร์ (ไม่เชื่อตัวเลขจากหน้าเว็บ)
//   3. ใน transaction เดียว: บันทึกประวัติทีละคน + บวกเงินเข้ายอดสะสมและยอดปันผล
// ถ้าจ่ายซ้ำปีเดิมจะถูกปฏิเสธทันที เพราะจะทำให้สมาชิกได้เงินซ้ำสองเท่า
export async function payDividend(input) {
  if (!input.rate || input.rate <= 0) {
    throw new DividendError("กรุณากรอกอัตราเงินปันผลเป็นตัวเลขมากกว่า 0");
  }
  if (!input.periodLabel?.trim()) {
    throw new DividendError("กรุณาระบุช่วงเวลาที่จ่ายปันผล");
  }

  const currentBuddhistYear = buddhistYearOf(new Date());
  if (input.buddhistYear > currentBuddhistYear) {
    throw new DividendError(
      `ยังไม่ถึงปี พ.ศ. ${input.buddhistYear} ในปัจจุบัน ไม่สามารถจ่ายเงินปันผลล่วงหน้าได้`
    );
  }

  const alreadyPaid = await prisma.dividendPayment.findFirst({
    where: { buddhistYear: input.buddhistYear },
    select: { id: true },
  });
  if (alreadyPaid) {
    throw new DividendError(
      `ปันผลประจำปี ${input.buddhistYear} ถูกคำนวณและจ่ายไปแล้ว ไม่สามารถคำนวณซ้ำได้`
    );
  }

  const purchases = await prisma.purchase.findMany({
    select: { memberId: true, dryWeightKg: true, recordDate: true },
  });

  // รวมน้ำหนักยางแห้งของแต่ละสมาชิก เฉพาะปีที่เลือก
  const dryWeightByMember = new Map();
  for (const purchase of purchases) {
    if (buddhistYearOf(purchase.recordDate) !== input.buddhistYear) continue;
    const memberId = purchase.memberId;
    dryWeightByMember.set(
      memberId,
      (dryWeightByMember.get(memberId) ?? 0) + purchase.dryWeightKg.toNumber()
    );
  }

  // เอาเฉพาะสมาชิกที่มีน้ำหนักมากกว่า 0
  const memberIds = [...dryWeightByMember.keys()].filter(
    (id) => (dryWeightByMember.get(id) ?? 0) > 0
  );
  if (memberIds.length === 0) {
    throw new DividendError("ไม่มีข้อมูลน้ำหนักยางแห้งสำหรับช่วงเวลานี้");
  }

  const startCode = await nextDividendCode();
  const startNumber = parseInt(startCode.replace("D-", ""), 10);

  // ฐานข้อมูลบังคับ (สมาชิก, ปี) ห้ามซ้ำ — ถ้ามีผู้ใช้อื่นจ่ายปีเดียวกันพร้อมกัน
  // transaction ทั้งก้อนจะถูกยกเลิก จึงไม่มีสมาชิกคนไหนได้เงินซ้ำ
  const payments = await prisma
    .$transaction(async (tx) => {
      const members = await tx.member.findMany({
        where: { id: { in: memberIds } },
      });

      const created = [];
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const dryWeightKg = dryWeightByMember.get(member.id) ?? 0;
        const amount = dryWeightKg * input.rate;
        const balanceBefore = member.walletBalance.toNumber();
        const balanceAfter = balanceBefore + amount;

        const payment = await tx.dividendPayment.create({
          data: {
            dividendCode: `D-${String(startNumber + i).padStart(4, "0")}`,
            memberId: member.id,
            memberCode: member.memberCode,
            memberName: `${member.firstName} ${member.lastName}`,
            buddhistYear: input.buddhistYear,
            periodLabel: input.periodLabel.trim(),
            rate: input.rate,
            dryWeightKg,
            amount,
            balanceBefore,
            balanceAfter,
          },
        });
        created.push(payment);

        await tx.member.update({
          where: { id: member.id },
          data: {
            walletBalance: { increment: amount },
            dividendBalance: { increment: amount },
          },
        });
      }

      return created;
    })
    .catch((error) => {
      // P2002 = ข้อมูลซ้ำ แปลว่ามีการจ่ายปันผลอื่นบันทึกเข้ามาก่อนหน้านี้พอดี
      // (ไม่ว่าจะซ้ำที่ สมาชิก+ปี หรือ เลขที่ปันผล) และไม่มีอะไรถูกบันทึก
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DividendError(
          `ปันผลประจำปี ${input.buddhistYear} ถูกจ่ายไปแล้ว หรือมีการจ่ายพร้อมกันจากผู้ใช้อื่น กรุณารีเฟรชหน้าแล้วตรวจสอบอีกครั้ง`
        );
      }
      throw error;
    });

  return payments.map(serializePayment);
}

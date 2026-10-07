// =============================================================================
// server/lib/data/withdrawals.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการ "การเบิกเงินสะสม" ของสมาชิก (ตาราง Withdrawal)
// ยอดคงเหลือหลังเบิก = ยอดก่อนเบิก − จำนวนที่เบิก
// =============================================================================

import { prisma } from "../prisma.js";

// แปลงแถว Withdrawal เป็นข้อมูลที่ส่งให้หน้าเว็บ
function serialize(withdrawal) {
  return {
    id: withdrawal.id,
    withdrawalCode: withdrawal.withdrawalCode,
    memberId: withdrawal.memberId,
    memberCode: withdrawal.memberCode,
    memberName: withdrawal.memberName,
    amount: withdrawal.amount.toNumber(),
    balanceBefore: withdrawal.balanceBefore.toNumber(),
    balanceAfter: withdrawal.balanceAfter.toNumber(),
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

// สร้างเลขที่รายการเบิกถัดไป เช่น W-0010 → W-0011
async function nextWithdrawalCode() {
  const last = await prisma.withdrawal.findFirst({
    orderBy: { withdrawalCode: "desc" },
    select: { withdrawalCode: true },
  });
  const n = last ? parseInt(last.withdrawalCode.replace("W-", ""), 10) : 0;
  return `W-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// error เฉพาะของการเบิกเงิน (ข้อความจะถูกส่งกลับไปให้ผู้ใช้เห็น)
export class WithdrawalError extends Error {}

// ค้นหาสมาชิกจากรหัส พร้อมยอดเงินสะสมปัจจุบัน
export async function lookupMember(code) {
  const trimmed = code.trim();
  const member = await prisma.member.findUnique({
    where: { memberCode: trimmed },
  });
  if (!member) {
    throw new WithdrawalError("ไม่พบรหัสสมาชิกนี้ในระบบ");
  }
  if (member.status !== "Active") {
    throw new WithdrawalError("สมาชิกรายนี้ถูกระงับการใช้งาน");
  }
  return {
    memberId: member.id,
    memberCode: member.memberCode,
    fullName: `${member.firstName} ${member.lastName}`,
    walletBalance: member.walletBalance.toNumber(),
  };
}

// รายการเบิกเงินทั้งหมด (ใหม่สุดก่อน)
export async function getWithdrawals() {
  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
  });
  return withdrawals.map(serialize);
}

// บันทึกการเบิกเงิน
// ตรวจยอดเงินพอหรือไม่ แล้วบันทึกรายการ + หักยอดสะสม ใน transaction เดียวกัน
export async function createWithdrawal(input) {
  const member = await lookupMember(input.memberCode);

  if (!input.amount || input.amount <= 0) {
    throw new WithdrawalError("กรุณากรอกยอดเงินที่ต้องการเบิก");
  }
  if (input.amount > member.walletBalance) {
    throw new WithdrawalError("ยอดเงินสะสมไม่เพียงพอสำหรับการเบิกครั้งนี้");
  }

  const balanceAfter = member.walletBalance - input.amount;
  const withdrawalCode = await nextWithdrawalCode();
  const [withdrawal] = await prisma.$transaction([
    prisma.withdrawal.create({
      data: {
        withdrawalCode,
        memberId: member.memberId,
        memberCode: member.memberCode,
        memberName: member.fullName,
        amount: input.amount,
        balanceBefore: member.walletBalance,
        balanceAfter,
      },
    }),
    prisma.member.update({
      where: { id: member.memberId },
      data: { walletBalance: { decrement: input.amount } },
    }),
  ]);
  return serialize(withdrawal);
}

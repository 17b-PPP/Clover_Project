import { prisma } from "@/lib/prisma";
import type { Withdrawal as PrismaWithdrawal } from "@prisma/client";
import type { MemberLookup, Withdrawal, WithdrawalInput } from "@/lib/types";

function serialize(withdrawal: PrismaWithdrawal): Withdrawal {
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

async function nextWithdrawalCode(): Promise<string> {
  const last = await prisma.withdrawal.findFirst({
    orderBy: { withdrawalCode: "desc" },
    select: { withdrawalCode: true },
  });
  const n = last ? parseInt(last.withdrawalCode.replace("W-", ""), 10) : 0;
  return `W-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

export class WithdrawalError extends Error {}

export async function lookupMember(code: string): Promise<MemberLookup> {
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

export async function getWithdrawals(): Promise<Withdrawal[]> {
  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
  });
  return withdrawals.map(serialize);
}

export async function createWithdrawal(
  input: WithdrawalInput
): Promise<Withdrawal> {
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

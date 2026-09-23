import { prisma } from "@/lib/prisma";
import type {
  DividendData,
  DividendPayment,
  DividendPaymentInput,
} from "@/lib/types";
import type { DividendPayment as PrismaDividendPayment } from "@prisma/client";

// recordDate is stored at UTC midnight of its business day, so its calendar
// year comes off the UTC parts. +543 converts to the Buddhist year the co-op
// pays dividends by.
function buddhistYearOf(date: Date): number {
  return date.getUTCFullYear() + 543;
}

export class DividendError extends Error {}

function serializePayment(payment: PrismaDividendPayment): DividendPayment {
  return {
    id: payment.id,
    dividendCode: payment.dividendCode,
    memberId: payment.memberId,
    memberCode: payment.memberCode,
    memberName: payment.memberName,
    buddhistYear: payment.buddhistYear,
    month: payment.month,
    rate: payment.rate.toNumber(),
    dryWeightKg: payment.dryWeightKg.toNumber(),
    amount: payment.amount.toNumber(),
    balanceBefore: payment.balanceBefore.toNumber(),
    balanceAfter: payment.balanceAfter.toNumber(),
    createdAt: payment.createdAt.toISOString(),
  };
}

async function nextDividendCode(): Promise<string> {
  const last = await prisma.dividendPayment.findFirst({
    orderBy: { dividendCode: "desc" },
    select: { dividendCode: true },
  });
  const n = last ? parseInt(last.dividendCode.replace("D-", ""), 10) : 0;
  return `D-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// Feeds the dividend calculator: the full member roster plus every purchase's
// dry weight tagged with its Buddhist year. The client totals dry weight per
// member for the selected year and multiplies by the rate the user enters —
// nothing is persisted.
export async function getDividendData(): Promise<DividendData> {
  const [members, purchases] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, memberCode: true, firstName: true, lastName: true },
      orderBy: { memberCode: "asc" },
    }),
    prisma.purchase.findMany({
      select: { memberId: true, dryWeightKg: true, recordDate: true },
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
      month: purchase.recordDate.getUTCMonth() + 1,
    })),
  };
}

// Pays out dividends for one year (or one month within it) at the given
// rate: recomputes each member's dry weight server-side (never trusts the
// client's totals), then in a single transaction credits both walletBalance
// (the withdrawable "ยอดเงินสะสม") and dividendBalance, and inserts one
// insert-only history row per member paid.
export async function payDividend(
  input: DividendPaymentInput
): Promise<DividendPayment[]> {
  if (!input.rate || input.rate <= 0) {
    throw new DividendError("กรุณากรอกอัตราเงินปันผลเป็นตัวเลขมากกว่า 0");
  }

  const purchases = await prisma.purchase.findMany({
    select: { memberId: true, dryWeightKg: true, recordDate: true },
  });

  const dryWeightByMember = new Map<string, number>();
  for (const purchase of purchases) {
    if (buddhistYearOf(purchase.recordDate) !== input.buddhistYear) continue;
    if (input.month !== 0 && purchase.recordDate.getUTCMonth() + 1 !== input.month) {
      continue;
    }
    const memberId = purchase.memberId;
    dryWeightByMember.set(
      memberId,
      (dryWeightByMember.get(memberId) ?? 0) + purchase.dryWeightKg.toNumber()
    );
  }

  const memberIds = [...dryWeightByMember.keys()].filter(
    (id) => (dryWeightByMember.get(id) ?? 0) > 0
  );
  if (memberIds.length === 0) {
    throw new DividendError("ไม่มีข้อมูลน้ำหนักยางแห้งสำหรับช่วงเวลานี้");
  }

  const startCode = await nextDividendCode();
  const startNumber = parseInt(startCode.replace("D-", ""), 10);

  const payments = await prisma.$transaction(async (tx) => {
    const members = await tx.member.findMany({
      where: { id: { in: memberIds } },
    });

    const created: PrismaDividendPayment[] = [];
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
          month: input.month === 0 ? null : input.month,
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
  });

  return payments.map(serializePayment);
}

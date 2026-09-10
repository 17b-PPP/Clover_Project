import { prisma } from "@/lib/prisma";
import type { DividendData } from "@/lib/types";

// recordDate is stored at UTC midnight of its business day, so its calendar
// year comes off the UTC parts. +543 converts to the Buddhist year the co-op
// pays dividends by.
function buddhistYearOf(date: Date): number {
  return date.getUTCFullYear() + 543;
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
    })),
  };
}

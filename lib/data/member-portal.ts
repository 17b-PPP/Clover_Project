import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/member-session";
import type {
  DailyMarketPrice,
  FinanceEntry,
  MemberProfile,
  MemberSalesSummary,
} from "@/lib/types";

export interface MemberPortalContext {
  memberId: string;
  profile: MemberProfile;
  marketPrice: DailyMarketPrice | null;
  fetchedAt: string;
}

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// en-CA renders as YYYY-MM-DD, which is exactly the calendar-day key the
// ledger sorts and formats on.
function bangkokDateKey(date: Date): string {
  return bangkokDateFormatter.format(date);
}

// Purchase.recordDate is stored at UTC midnight of the day it was recorded
// for (the same convention formatDateUtc reads it back with), so its calendar
// day comes off the UTC parts — never the runtime's local ones.
function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Period boundaries are built in UTC from today's *Bangkok* date to match how
// recordDate is stored: deriving them from the server clock would push a
// late-evening UTC request into the previous month or year for Thai users.
function currentThaiPeriod(): { year: number; month: number } {
  const [year, month] = bangkokDateKey(new Date()).split("-").map(Number);
  return { year, month };
}

// Deliberately derives the quoted price from the last recorded purchase, NOT
// from the newer admin-set ReferencePrice table — the two can disagree (e.g.
// an admin sets tomorrow's price before any purchase is entered), and
// reconciling them here was an explicit out-of-scope decision, not an oversight.
export const getDailyMarketPrice = cache(
  async (): Promise<DailyMarketPrice | null> => {
    const latest = await prisma.purchase.findFirst({
      orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
      select: { marketPrice: true, recordDate: true },
    });
    if (!latest) return null;
    return {
      price: latest.marketPrice.toNumber(),
      recordDate: latest.recordDate.toISOString(),
    };
  }
);

// Every portal page calls this. proxy.ts only proves the session cookie is
// valid and unexpired, so the member's status is re-checked on each render —
// a member suspended mid-session is logged straight back out rather than
// keeping a working portal until their cookie happens to expire.
export const requireMemberPortal = cache(
  async (): Promise<MemberPortalContext> => {
    const session = await getMemberSession();
    if (!session) {
      redirect("/member/login");
    }

    const [member, marketPrice] = await Promise.all([
      prisma.member.findUnique({
        where: { id: session.memberId },
        select: {
          id: true,
          memberCode: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          gardenName: true,
          walletBalance: true,
          dividendBalance: true,
          status: true,
        },
      }),
      getDailyMarketPrice(),
    ]);

    if (!member || member.status !== "Active") {
      redirect("/api/member-auth/force-logout");
    }

    return {
      memberId: member.id,
      profile: {
        id: member.id,
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
        photoUrl: member.photoUrl,
        gardenName: member.gardenName,
        walletBalance: member.walletBalance.toNumber(),
        dividendBalance: member.dividendBalance.toNumber(),
      },
      marketPrice,
      fetchedAt: new Date().toISOString(),
    };
  }
);

export async function getMemberSalesSummary(
  memberId: string
): Promise<MemberSalesSummary> {
  const { year, month } = currentThaiPeriod();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));

  const [monthly, yearly] = await Promise.all([
    prisma.purchase.aggregate({
      where: { memberId, recordDate: { gte: monthStart, lt: nextMonthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.purchase.aggregate({
      where: { memberId, recordDate: { gte: yearStart, lt: nextYearStart } },
      _sum: { rawWeightKg: true },
    }),
  ]);

  return {
    monthlySalesAmount: monthly._sum.totalAmount?.toNumber() ?? 0,
    yearlyRawWeightKg: yearly._sum.rawWeightKg?.toNumber() ?? 0,
  };
}

// A member's money moves in exactly two ways: a latex sale credits their share
// of the purchase to the wallet, a withdrawal debits it. Both are merged into
// one signed ledger so the member sees income and outgoings in a single run.
export async function getMemberFinanceHistory(
  memberId: string
): Promise<FinanceEntry[]> {
  const [purchases, withdrawals] = await Promise.all([
    prisma.purchase.findMany({
      where: { memberId },
      select: {
        id: true,
        purchaseCode: true,
        recordDate: true,
        ownerPayout: true,
        sellerType: true,
        deliveredByName: true,
        employeePayout: true,
        createdAt: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { memberId },
      select: {
        id: true,
        withdrawalCode: true,
        amount: true,
        createdAt: true,
      },
    }),
  ]);

  const rows = [
    ...purchases.map((purchase) => {
      // Show the employee's cut only when one was actually delivered and paid
      // by an employee — a member selling their own latex has no such line.
      const employeeDelivered =
        purchase.sellerType === "EMPLOYEE" &&
        purchase.employeePayout.toNumber() > 0;
      return {
        id: purchase.id,
        date: utcDateKey(purchase.recordDate),
        type: "PURCHASE" as const,
        code: purchase.purchaseCode,
        amount: purchase.ownerPayout.toNumber(),
        recordedAt: purchase.createdAt.toISOString(),
        deliveredByName: employeeDelivered
          ? purchase.deliveredByName
          : undefined,
        employeePayout: employeeDelivered
          ? purchase.employeePayout.toNumber()
          : undefined,
      };
    }),
    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      // A withdrawal has no separate record date — it happens when it is made.
      date: bangkokDateKey(withdrawal.createdAt),
      type: "WITHDRAWAL" as const,
      code: withdrawal.withdrawalCode,
      amount: -withdrawal.amount.toNumber(),
      recordedAt: withdrawal.createdAt.toISOString(),
      deliveredByName: undefined,
      employeePayout: undefined,
    })),
  ];

  return rows
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt)
    )
    .map((row) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      code: row.code,
      amount: row.amount,
      deliveredByName: row.deliveredByName,
      employeePayout: row.employeePayout,
    }));
}

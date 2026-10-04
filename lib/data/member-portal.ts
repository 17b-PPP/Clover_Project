import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMemberSession } from "@/lib/member-session";
import type {
  DailyMarketPrice,
  FinanceEntry,
  MemberEmployeeInfo,
  MemberEmployeeSale,
  MemberProfile,
  MemberSalesSummary,
  MemberYearlySummary,
} from "@/lib/types";

// How many past years the dashboard's year selector offers, in addition to
// the current year.
const YEARS_BACK = 4;

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

// Quotes the reference price staff set on the ราคากลางประจำวัน page — the
// same ReferencePrice row the purchase page pre-fills from. ReferencePrice is
// keyed by Bangkok day at UTC midnight, so today's key is built from the
// Bangkok date. If today hasn't been set yet, the most recent earlier day is
// shown (the topbar prints its date); a price set ahead for a future day is
// never shown early.
export const getDailyMarketPrice = cache(
  async (): Promise<DailyMarketPrice | null> => {
    const today = new Date(bangkokDateKey(new Date()));
    const latest = await prisma.referencePrice.findFirst({
      where: { date: { lte: today } },
      orderBy: { date: "desc" },
      select: { price: true, date: true },
    });
    if (!latest) return null;
    return {
      price: latest.price.toNumber(),
      recordDate: latest.date.toISOString(),
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

  const monthly = await prisma.purchase.aggregate({
    where: { memberId, recordDate: { gte: monthStart, lt: nextMonthStart } },
    _sum: { totalAmount: true },
  });

  return {
    monthlySalesAmount: monthly._sum.totalAmount?.toNumber() ?? 0,
  };
}

// Weight totals for the current Buddhist year plus YEARS_BACK years before
// it, so the dashboard's year selector can switch client-side with no
// further round trip.
export async function getMemberYearlySummaries(
  memberId: string
): Promise<MemberYearlySummary[]> {
  const { year: currentAdYear } = currentThaiPeriod();
  const currentBuddhistYear = currentAdYear + 543;
  const buddhistYears = Array.from(
    { length: YEARS_BACK + 1 },
    (_, i) => currentBuddhistYear - i
  );

  return Promise.all(
    buddhistYears.map(async (buddhistYear) => {
      const adYear = buddhistYear - 543;
      const yearStart = new Date(Date.UTC(adYear, 0, 1));
      const nextYearStart = new Date(Date.UTC(adYear + 1, 0, 1));
      const where = {
        memberId,
        recordDate: { gte: yearStart, lt: nextYearStart },
      };

      const [{ _sum }, employeePurchases] = await Promise.all([
        prisma.purchase.aggregate({
          where,
          _sum: { rawWeightKg: true, dryWeightKg: true, totalAmount: true },
        }),
        prisma.purchase.findMany({
          where: { ...where, sellerType: "EMPLOYEE" },
          select: { employeeId: true, deliveredByName: true, totalAmount: true },
        }),
      ]);

      const salesByEmployee = new Map<string, MemberEmployeeSale>();
      for (const purchase of employeePurchases) {
        if (!purchase.employeeId) continue;
        const amount = purchase.totalAmount.toNumber();
        const existing = salesByEmployee.get(purchase.employeeId);
        if (existing) {
          existing.amount += amount;
        } else {
          salesByEmployee.set(purchase.employeeId, {
            name: purchase.deliveredByName,
            amount,
          });
        }
      }

      return {
        year: buddhistYear,
        rawWeightKg: _sum.rawWeightKg?.toNumber() ?? 0,
        dryWeightKg: _sum.dryWeightKg?.toNumber() ?? 0,
        totalAmount: _sum.totalAmount?.toNumber() ?? 0,
        employeeSales: [...salesByEmployee.values()].sort(
          (a, b) => b.amount - a.amount
        ),
      };
    })
  );
}

// The employees currently under an active, unexpired contract to deliver this
// member's latex (see MePair) — shown on the portal so the member can see who
// is authorized to sell on their behalf and at what revenue split.
export async function getMemberEmployeeInfo(
  memberId: string
): Promise<MemberEmployeeInfo[]> {
  const pairs = await prisma.mePair.findMany({
    where: { memberId, status: "Active" },
    select: {
      memberShare: true,
      employeeShare: true,
      contractEndDate: true,
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { contractStartDate: "desc" },
  });

  const now = new Date();
  return pairs
    .filter((pair) => !pair.contractEndDate || pair.contractEndDate > now)
    .map((pair) => ({
      employeeCode: pair.employee.employeeCode,
      firstName: pair.employee.firstName,
      lastName: pair.employee.lastName,
      phone: pair.employee.phone,
      memberShare: pair.memberShare.toNumber(),
      employeeShare: pair.employeeShare.toNumber(),
    }));
}

// A member's wallet moves in three ways: a latex sale credits their share of
// the purchase, a dividend payout credits it, and a withdrawal debits it. All
// three are merged into one signed ledger so the member sees every change to
// their balance in a single run.
export async function getMemberFinanceHistory(
  memberId: string
): Promise<FinanceEntry[]> {
  const [purchases, withdrawals, dividends] = await Promise.all([
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
        rawWeightKg: true,
        dryPercentage: true,
        marketPrice: true,
        createdAt: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { memberId },
      select: {
        id: true,
        withdrawalCode: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,
      },
    }),
    prisma.dividendPayment.findMany({
      where: { memberId },
      select: {
        id: true,
        dividendCode: true,
        amount: true,
        buddhistYear: true,
        periodLabel: true,
        rate: true,
        dryWeightKg: true,
        createdAt: true,
      },
    }),
  ]);

  const rows: (FinanceEntry & { recordedAt: string })[] = [
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
        rawWeightKg: purchase.rawWeightKg.toNumber(),
        dryPercentage: purchase.dryPercentage.toNumber(),
        marketPrice: purchase.marketPrice.toNumber(),
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
      balanceAfter: withdrawal.balanceAfter.toNumber(),
    })),
    ...dividends.map((dividend) => ({
      id: dividend.id,
      // Like a withdrawal, a payout happens the moment staff confirm it.
      date: bangkokDateKey(dividend.createdAt),
      type: "DIVIDEND" as const,
      code: dividend.dividendCode,
      amount: dividend.amount.toNumber(),
      recordedAt: dividend.createdAt.toISOString(),
      buddhistYear: dividend.buddhistYear,
      periodLabel: dividend.periodLabel,
      rate: dividend.rate.toNumber(),
      dryWeightKg: dividend.dryWeightKg.toNumber(),
    })),
  ];

  return rows
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt)
    )
    .map((row) => {
      // recordedAt only breaks same-day ties; it isn't part of the entry.
      const entry: FinanceEntry & { recordedAt?: string } = { ...row };
      delete entry.recordedAt;
      return entry;
    });
}

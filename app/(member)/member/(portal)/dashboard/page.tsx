import { MemberTopbar } from "@/components/member/MemberTopbar";
import { DividendCard } from "@/components/member/DividendCard";
import { EmployeeCard } from "@/components/member/EmployeeCard";
import { SummaryCards } from "@/components/member/SummaryCards";
import { WalletCard } from "@/components/member/WalletCard";
import {
  getMemberEmployeeInfo,
  getMemberSalesSummary,
  getMemberYearlySummaries,
  requireMemberPortal,
} from "@/lib/data/member-portal";

export default async function MemberDashboardPage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();

  const [summary, yearlySummaries, employees] = await Promise.all([
    getMemberSalesSummary(memberId),
    getMemberYearlySummaries(memberId),
    getMemberEmployeeInfo(memberId),
  ]);

  return (
    <>
      <MemberTopbar
        firstName={profile.firstName}
        lastName={profile.lastName}
        fetchedAt={fetchedAt}
        marketPrice={marketPrice}
      />

      <div className="mx-auto max-w-6xl px-8 py-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WalletCard
            balance={profile.walletBalance}
            memberCode={profile.memberCode}
          />
          <EmployeeCard employees={employees} />
          <SummaryCards
            monthlySalesAmount={summary.monthlySalesAmount}
            yearlySummaries={yearlySummaries}
          />
          <DividendCard dividendBalance={profile.dividendBalance} />
        </section>
      </div>
    </>
  );
}

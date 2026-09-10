import { MemberTopbar } from "@/components/member/MemberTopbar";
import { DividendCard } from "@/components/member/DividendCard";
import { SummaryCards } from "@/components/member/SummaryCards";
import { WalletCard } from "@/components/member/WalletCard";
import {
  getMemberSalesSummary,
  requireMemberPortal,
} from "@/lib/data/member-portal";

export default async function MemberDashboardPage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();

  const summary = await getMemberSalesSummary(memberId);

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
          <SummaryCards
            monthlySalesAmount={summary.monthlySalesAmount}
            yearlyRawWeightKg={summary.yearlyRawWeightKg}
          />
          <DividendCard dividendBalance={profile.dividendBalance} />
          <WalletCard
            balance={profile.walletBalance}
            memberCode={profile.memberCode}
          />
        </section>
      </div>
    </>
  );
}

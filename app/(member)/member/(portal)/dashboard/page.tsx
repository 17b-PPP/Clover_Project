import { MemberTopbar } from "@/components/member/MemberTopbar";
import { EmployeeCard } from "@/components/member/EmployeeCard";
import { MemberOverviewSections } from "@/components/member/MemberOverviewSections";
import { WalletCard } from "@/components/member/WalletCard";
import {
  getMemberEmployeeInfo,
  getMemberFinanceHistory,
  getMemberWalletMonthlySummary,
  requireMemberPortal,
} from "@/lib/data/member-portal";

export default async function MemberDashboardPage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();

  const [walletSummary, entries, employees] = await Promise.all([
    getMemberWalletMonthlySummary(memberId),
    getMemberFinanceHistory(memberId),
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
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <WalletCard
              balance={profile.walletBalance}
              monthlyEarnings={walletSummary.monthlyEarnings}
            />
            <EmployeeCard employees={employees} />
          </section>

          <MemberOverviewSections entries={entries} />
        </div>
      </div>
    </>
  );
}

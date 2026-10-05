import { MemberTopbar } from "@/components/member/MemberTopbar";
import { EmployeeCard } from "@/components/member/EmployeeCard";
import { FinanceOverviewSection } from "@/components/member/FinanceOverviewSection";
import { LatexOverviewSection } from "@/components/member/LatexOverviewSection";
import { WalletCard } from "@/components/member/WalletCard";
import {
  getMemberEmployeeInfo,
  getMemberYearlySummaries,
  requireMemberPortal,
} from "@/lib/data/member-portal";

export default async function MemberDashboardPage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();

  const [yearlySummaries, employees] = await Promise.all([
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
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <WalletCard
              balance={profile.walletBalance}
              memberCode={profile.memberCode}
            />
            <EmployeeCard employees={employees} />
          </section>

          <LatexOverviewSection yearlySummaries={yearlySummaries} />
          <FinanceOverviewSection yearlySummaries={yearlySummaries} />
        </div>
      </div>
    </>
  );
}

import { MemberTopbar } from "@/components/member/MemberTopbar";
import {
  getMemberFinanceHistory,
  requireMemberPortal,
} from "@/lib/data/member-portal";
import { MemberFinancePageClient } from "./MemberFinancePageClient";

export default async function MemberFinancePage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();
  const entries = await getMemberFinanceHistory(memberId);

  return (
    <>
      <MemberTopbar
        firstName={profile.firstName}
        lastName={profile.lastName}
        fetchedAt={fetchedAt}
        marketPrice={marketPrice}
      />
      <MemberFinancePageClient
        entries={entries}
        walletBalance={profile.walletBalance}
        memberCode={profile.memberCode}
      />
    </>
  );
}

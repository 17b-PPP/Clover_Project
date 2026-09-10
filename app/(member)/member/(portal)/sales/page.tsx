import { MemberTopbar } from "@/components/member/MemberTopbar";
import { requireMemberPortal } from "@/lib/data/member-portal";
import { getPurchaseHistoryForMember } from "@/lib/data/purchases";
import { MemberSalesPageClient } from "./MemberSalesPageClient";

export default async function MemberSalesPage() {
  const { memberId, profile, marketPrice, fetchedAt } =
    await requireMemberPortal();
  const purchases = await getPurchaseHistoryForMember(memberId);

  return (
    <>
      <MemberTopbar
        firstName={profile.firstName}
        lastName={profile.lastName}
        fetchedAt={fetchedAt}
        marketPrice={marketPrice}
      />
      <MemberSalesPageClient purchases={purchases} />
    </>
  );
}

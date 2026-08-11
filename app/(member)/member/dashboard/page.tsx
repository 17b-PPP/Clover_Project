import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/member-session";
import { getPurchaseHistoryForMember } from "@/lib/data/purchases";
import { MemberDashboardClient } from "./MemberDashboardClient";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  if (!session) {
    redirect("/member/login");
  }

  const purchases = await getPurchaseHistoryForMember(session.memberId);
  return <MemberDashboardClient purchases={purchases} />;
}

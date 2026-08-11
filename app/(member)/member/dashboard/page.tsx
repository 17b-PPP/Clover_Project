import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/member-session";
import { prisma } from "@/lib/prisma";
import { getPurchaseHistoryForMember } from "@/lib/data/purchases";
import { MemberDashboardClient } from "./MemberDashboardClient";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  if (!session) {
    redirect("/member/login");
  }

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: { status: true },
  });
  if (!member || member.status !== "Active") {
    redirect("/api/member-auth/force-logout");
  }

  const purchases = await getPurchaseHistoryForMember(session.memberId);
  return <MemberDashboardClient purchases={purchases} />;
}

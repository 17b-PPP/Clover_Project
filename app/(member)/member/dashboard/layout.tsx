import { getMemberSession } from "@/lib/member-session";
import { MemberHeader } from "@/components/layout/MemberHeader";

export default async function MemberDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getMemberSession();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <MemberHeader currentMember={session} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

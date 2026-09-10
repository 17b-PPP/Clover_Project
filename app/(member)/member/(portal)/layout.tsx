import { MemberSidebar } from "@/components/layout/MemberSidebar";
import { requireMemberPortal } from "@/lib/data/member-portal";

// Route group, so /member/login keeps its own bare centered-card layout while
// every signed-in member page gets the sidebar shell.
export default async function MemberPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await requireMemberPortal();

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      <MemberSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

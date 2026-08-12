import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/session";
import { isUsingDefaultPassword } from "@/lib/data/users";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const usingDefaultPassword = session
    ? await isUsingDefaultPassword(session.staffId)
    : false;

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar currentUser={session} usingDefaultPassword={usingDefaultPassword} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar currentUser={session} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

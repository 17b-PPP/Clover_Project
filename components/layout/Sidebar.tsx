"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session-core";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Staff",
    items: [
      {
        label: "ระบบรับซื้อน้ำยาง",
        href: "/purchases",
        icon: <Icon path="M12 2v6M8 6l4-4 4 4M6 10h12l-1.5 10.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6 10Z" />,
      },
      {
        label: "ระบบสมาชิก",
        href: "/members",
        icon: <Icon path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
      },
      {
        label: "ระบบลูกจ้าง",
        href: "/employees",
        icon: <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
      },
      {
        label: "สัญญาจ้าง",
        href: "/contracts",
        icon: <Icon path="M9 12h6M9 16h6M9 8h1M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "ตรวจสอบสิทธิ์ผู้ใช้งาน",
        href: "/users",
        icon: <Icon path="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" />,
      },
      {
        label: "ประวัติการใช้งาน",
        href: "/audit-log",
        icon: <Icon path="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />,
      },
    ],
  },
];

const roleLabel: Record<SessionPayload["role"], string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STAFF: "พนักงาน",
};

interface SidebarProps {
  currentUser: SessionPayload | null;
}

export function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
          FL
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">
            Field Latex
          </p>
          <p className="text-xs text-slate-500">ระบบจัดการรับซื้อน้ำยางพารา</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={
                        isActive
                          ? "text-emerald-700"
                          : "text-slate-400 group-hover:text-slate-500"
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-4">
        {currentUser && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium text-slate-900">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {roleLabel[currentUser.role]} · @{currentUser.username}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
        >
          <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
      </div>
    </aside>
  );
}

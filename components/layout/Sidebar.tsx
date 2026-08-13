"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session-core";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";

function GearIcon() {
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
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

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

interface NavGroupWithRoles extends NavGroup {
  roles?: SessionPayload["role"][];
}

const navGroups: NavGroupWithRoles[] = [
  {
    label: "Staff",
    items: [
      {
        label: "ระบบรับซื้อน้ำยาง",
        href: "/purchases",
        icon: <Icon path="M12 2v6M8 6l4-4 4 4M6 10h12l-1.5 10.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6 10Z" />,
      },
      {
        label: "ระบบเบิกเงิน",
        href: "/withdrawals",
        icon: <Icon path="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
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
    label: "Reports",
    items: [
      {
        label: "ประวัติการรับซื้อน้ำยาง",
        href: "/performance/purchases",
        icon: <Icon path="M3 3v18h18M8 17V10M13 17V6M18 17v-4" />,
      },
    ],
  },
  {
    label: "Admin",
    roles: ["ADMIN"],
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
  usingDefaultPassword?: boolean;
}

export function Sidebar({
  currentUser,
  usingDefaultPassword = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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
            สหกรณ์กองทุนสวนยางบ้านบางบอน
          </p>
          <p className="text-xs text-slate-500">ระบบจัดการรับซื้อน้ำยางพารา</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 px-3 py-4">
        {navGroups
          .filter(
            (group) =>
              !group.roles ||
              (currentUser && group.roles.includes(currentUser.role))
          )
          .map((group) => (
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
          <div className="mb-3 flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {roleLabel[currentUser.role]} · @{currentUser.username}
              </p>
            </div>
            {currentUser.role === "STAFF" && (
              <button
                onClick={() => setChangePasswordOpen(true)}
                aria-label={
                  usingDefaultPassword
                    ? "เปลี่ยนรหัสผ่าน (กำลังใช้รหัสผ่านตั้งต้น)"
                    : "เปลี่ยนรหัสผ่าน"
                }
                title={
                  usingDefaultPassword
                    ? "เปลี่ยนรหัสผ่าน (กำลังใช้รหัสผ่านตั้งต้น)"
                    : "เปลี่ยนรหัสผ่าน"
                }
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <GearIcon />
                {usingDefaultPassword && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            )}
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

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </aside>
  );
}

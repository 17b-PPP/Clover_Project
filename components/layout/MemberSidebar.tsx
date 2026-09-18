"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { MemberProfile } from "@/lib/types";

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

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "หน้าหลัก",
    href: "/member/dashboard",
    icon: <Icon path="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />,
  },
  {
    label: "ประวัติทางการเงิน",
    href: "/member/finance",
    icon: <Icon path="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  {
    label: "ประวัติการขาย",
    href: "/member/sales",
    icon: <Icon path="M3 3v18h18M8 17V10M13 17V6M18 17v-4" />,
  },
];

interface MemberSidebarProps {
  profile: MemberProfile;
}

export function MemberSidebar({ profile }: MemberSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const fullName = `${profile.firstName} ${profile.lastName}`;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/member-auth/logout", { method: "POST" });
      router.push("/member/login");
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
          <p className="text-xs text-slate-500">การจัดการสมาชิก</p>
        </div>
      </div>

      <div className="flex flex-col items-center border-b border-slate-200 px-6 py-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={`รูปประจำตัวของ ${fullName}`}
              width={80}
              height={80}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-slate-400">
              {profile.firstName.charAt(0)}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-900">{fullName}</p>
        <p className="mt-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
          {profile.memberCode}
        </p>
        {profile.gardenName && (
          <p className="mt-2 truncate text-xs text-slate-500">
            สวน{profile.gardenName}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
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
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
      </div>
    </aside>
  );
}

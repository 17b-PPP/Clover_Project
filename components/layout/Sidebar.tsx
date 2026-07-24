"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  enabled: boolean;
}

const navItems: NavItem[] = [
  { label: "เข้าสู่ระบบ", href: "/login", enabled: false },
  { label: "ระบบสมาชิก", href: "/members", enabled: true },
  { label: "ระบบลูกจ้าง", href: "/employees", enabled: true },
  { label: "การรับซื้อน้ำยาง", href: "/purchases", enabled: false },
  { label: "รายการเบิกเงิน", href: "/withdrawals", enabled: false },
  { label: "สัญญาจ้าง", href: "/contracts", enabled: true },
  { label: "ผลประกอบการ", href: "/performance", enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-lg font-semibold text-slate-900">Field Latex</p>
        <p className="text-xs text-slate-500">ระบบจัดการรับซื้อน้ำยางพารา</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-slate-400"
                title="เร็ว ๆ นี้"
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-300">เร็ว ๆ นี้</span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-400">
        เฉพาะพนักงานเท่านั้น
      </div>
    </aside>
  );
}

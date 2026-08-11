"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberSessionPayload } from "@/lib/member-session-core";

interface MemberHeaderProps {
  currentMember: MemberSessionPayload | null;
}

export function MemberHeader({ currentMember }: MemberHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
          FL
        </div>
        <p className="text-sm font-semibold text-slate-900">
          {currentMember
            ? `${currentMember.firstName} ${currentMember.lastName}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
      </button>
    </header>
  );
}

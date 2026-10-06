"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatDateTimeThai, formatNumber } from "@/lib/format";
import type { FinanceEntryType, MemberNotification } from "@/lib/types";

const typeMeta: Record<
  FinanceEntryType,
  {
    title: string;
    sign: string;
    amountClass: string;
    iconClass: string;
    icon: string;
  }
> = {
  PURCHASE: {
    title: "เงินเข้าจากการขายน้ำยาง",
    sign: "+",
    amountClass: "text-emerald-700",
    iconClass: "bg-emerald-50 text-emerald-700",
    icon: "M12 5v14M5 12l7 7 7-7",
  },
  WITHDRAWAL: {
    title: "เบิกเงินออก",
    sign: "-",
    amountClass: "text-rose-600",
    iconClass: "bg-rose-50 text-rose-600",
    icon: "M12 19V5M5 12l7-7 7 7",
  },
  DIVIDEND: {
    title: "ได้รับเงินปันผล",
    sign: "+",
    amountClass: "text-amber-700",
    iconClass: "bg-amber-50 text-amber-700",
    icon: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
  },
};

// "Read" is remembered per browser as the newest notification's timestamp at
// the moment the member last opened the bell — anything created after it is
// unread. Kept in localStorage so it needs no schema change.
const storageEvent = "member-notifications-seen";

function storageKey(memberId: string) {
  return `member-notifications-seen:${memberId}`;
}

function readSeenAt(memberId: string): string {
  try {
    return localStorage.getItem(storageKey(memberId)) ?? "";
  } catch {
    return "";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEvent, callback);
  };
}

interface NotificationBellProps {
  memberId: string;
  notifications: MemberNotification[];
}

export function NotificationBell({
  memberId,
  notifications,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [highlightBefore, setHighlightBefore] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rendered as "nothing unread" on the server so the badge never flashes in
  // for a member who has already seen everything.
  const seenAt = useSyncExternalStore(
    subscribe,
    () => readSeenAt(memberId),
    () => null,
  );

  const unreadCount =
    seenAt === null
      ? 0
      : notifications.filter((item) => item.occurredAt > seenAt).length;

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function markAllSeen() {
    const newest = notifications[0]?.occurredAt;
    if (!newest) return;
    try {
      localStorage.setItem(storageKey(memberId), newest);
    } catch {
      // Storage blocked (private mode etc.) — the badge just stays as is.
    }
    window.dispatchEvent(new Event(storageEvent));
  }

  function handleToggle() {
    if (!open) {
      // Snapshot what was unread before marking it seen, so those rows stay
      // highlighted while the panel is open.
      setHighlightBefore(seenAt ?? "");
      markAllSeen();
    }
    setOpen((value) => !value);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `การแจ้งเตือน ${unreadCount} รายการใหม่`
            : "การแจ้งเตือน"
        }
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              ยังไม่มีการแจ้งเตือน
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((item) => {
                const meta = typeMeta[item.type];
                const isNew =
                  highlightBefore !== null && item.occurredAt > highlightBefore;
                return (
                  <li
                    key={`${item.type}-${item.id}`}
                    className={`flex gap-3 px-4 py-3 ${isNew ? "bg-emerald-50/50" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d={meta.icon} />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {meta.title}
                        </p>
                        {isNew && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />
                        )}
                      </div>
                      <p
                        className={`text-sm font-semibold tabular-nums ${meta.amountClass}`}
                      >
                        {meta.sign}
                        {formatNumber(item.amount)} บาท
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.code} · {formatDateTimeThai(item.occurredAt)} น.
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/member/finance"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 hover:bg-slate-50"
          >
            ดูประวัติทางการเงินทั้งหมด
          </Link>
        </div>
      )}
    </div>
  );
}

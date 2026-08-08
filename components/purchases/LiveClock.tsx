"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-right">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        เวลาปัจจุบัน
      </p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">
        {time ?? "--:--:--"}
      </p>
    </div>
  );
}

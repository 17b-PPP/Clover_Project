"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

// How many past years the selector offers. There is no per-year dividend data
// stored yet, so past years render a placeholder — the selector is in place for
// when that history exists.
const YEARS_BACK = 4;

interface DividendCardProps {
  dividendBalance: number;
}

export function DividendCard({ dividendBalance }: DividendCardProps) {
  const currentYear = useMemo(() => new Date().getFullYear() + 543, []);
  const years = useMemo(
    () => Array.from({ length: YEARS_BACK + 1 }, (_, i) => currentYear - i),
    [currentYear]
  );
  const [year, setYear] = useState(currentYear);
  const isCurrentYear = year === currentYear;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          ยอดเงินปันผลประจำปี
        </p>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="เลือกปีเงินปันผล"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {isCurrentYear ? formatCurrency(dividendBalance) : "—"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {isCurrentYear
          ? "เงินปันผลที่ได้รับจากสหกรณ์"
          : `ยังไม่มีข้อมูลเงินปันผลปี ${year}`}
      </p>
    </div>
  );
}

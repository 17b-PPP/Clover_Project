"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { FinanceEntry } from "@/lib/types";

interface YearSummary {
  amount: number;
  periodLabel: string | null;
}

interface DividendCardProps {
  dividendBalance: number;
  entries: FinanceEntry[];
}

export function DividendCard({ dividendBalance, entries }: DividendCardProps) {
  const dividendsByYear = useMemo(() => {
    const map = new Map<number, YearSummary>();
    for (const entry of entries) {
      if (entry.type !== "DIVIDEND" || entry.buddhistYear == null) continue;
      const existing = map.get(entry.buddhistYear);
      if (existing) {
        existing.amount += entry.amount;
      } else {
        map.set(entry.buddhistYear, {
          amount: entry.amount,
          periodLabel: entry.periodLabel ?? null,
        });
      }
    }
    return map;
  }, [entries]);

  // Always offer the current year even with no payout yet, so the filter is
  // there from day one instead of only appearing once a dividend exists.
  const years = useMemo(() => {
    const currentBuddhistYear = new Date().getUTCFullYear() + 543;
    const set = new Set<number>([currentBuddhistYear, ...dividendsByYear.keys()]);
    return [...set].sort((a, b) => b - a);
  }, [dividendsByYear]);

  const [selectedYear, setSelectedYear] = useState(years[0]);
  const activeYear = years.includes(selectedYear) ? selectedYear : years[0];
  const yearSummary = dividendsByYear.get(activeYear);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        เงินปันผล
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            ยอดปันผลสะสม (บาท)
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
            {formatNumber(dividendBalance)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">
              ปันผลประจำปี
            </p>
            <select
              value={activeYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
            {formatNumber(yearSummary?.amount ?? 0)}
          </p>
          {yearSummary?.periodLabel && (
            <p className="mt-1 text-xs text-slate-500">
              {yearSummary.periodLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

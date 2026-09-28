"use client";

import { useState, type ReactNode } from "react";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { MemberYearlySummary } from "@/lib/types";

interface SummaryCardProps {
  label: string;
  value: string;
  hint: string;
  icon?: string;
  selector?: ReactNode;
}

function SummaryCard({ label, value, hint, icon, selector }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {selector ?? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d={icon} />
            </svg>
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

interface SummaryCardsProps {
  monthlySalesAmount: number;
  yearlySummaries: MemberYearlySummary[];
}

function useYearSelector(
  yearlySummaries: MemberYearlySummary[],
  ariaLabel: string
) {
  const currentYear =
    yearlySummaries[0]?.year ?? new Date().getFullYear() + 543;
  const [year, setYear] = useState(currentYear);
  const selected = yearlySummaries.find((entry) => entry.year === year) ?? {
    year,
    rawWeightKg: 0,
    dryWeightKg: 0,
  };

  const selector = (
    <select
      value={year}
      onChange={(e) => setYear(Number(e.target.value))}
      aria-label={ariaLabel}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
    >
      {yearlySummaries.map((entry) => (
        <option key={entry.year} value={entry.year}>
          {entry.year}
        </option>
      ))}
    </select>
  );

  return { year, selected, selector };
}

// Returns the cards bare, so the dashboard can lay them out in the same grid as
// the dividend and wallet cards rather than nesting one grid inside another.
export function SummaryCards({
  monthlySalesAmount,
  yearlySummaries,
}: SummaryCardsProps) {
  const rawWeight = useYearSelector(yearlySummaries, "เลือกปีน้ำหนักน้ำยาง");
  const dryWeight = useYearSelector(yearlySummaries, "เลือกปีน้ำยางแห้ง");

  return (
    <>
      <SummaryCard
        label="ยอดขายรายเดือน"
        value={formatCurrency(monthlySalesAmount)}
        hint="ยอดขายน้ำยางรวมของเดือนนี้"
        icon="M3 3v18h18M8 17V10M13 17V6M18 17v-4"
      />
      <SummaryCard
        label="น้ำหนักรวม"
        value={`${formatNumber(rawWeight.selected.rawWeightKg)} กก.`}
        hint={`น้ำหนักน้ำยางที่ส่งขายรวมทั้งปี ${rawWeight.year}`}
        selector={rawWeight.selector}
      />
      <SummaryCard
        label="น้ำยางแห้งรวม"
        value={`${formatNumber(dryWeight.selected.dryWeightKg)} กก.`}
        hint={`น้ำหนักน้ำยางแห้งที่ส่งขายรวมทั้งปี ${dryWeight.year}`}
        selector={dryWeight.selector}
      />
    </>
  );
}

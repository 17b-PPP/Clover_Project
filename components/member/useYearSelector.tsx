"use client";

import { useState } from "react";
import type { MemberYearlySummary } from "@/lib/types";

export function useYearSelector(
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
    totalAmount: 0,
    employeeSales: [],
    withdrawnAmount: 0,
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

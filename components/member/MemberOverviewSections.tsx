"use client";

import { useMemo, useState } from "react";
import { DividendCard } from "@/components/member/DividendCard";
import { FinanceOverviewSection } from "@/components/member/FinanceOverviewSection";
import { LatexOverviewSection } from "@/components/member/LatexOverviewSection";
import { Input } from "@/components/ui/Input";
import { ResetButton } from "@/components/ui/ResetButton";
import type { FinanceEntry, MemberEmployeeSale } from "@/lib/types";

interface MemberOverviewSectionsProps {
  entries: FinanceEntry[];
  dividendBalance: number;
}

export function MemberOverviewSections({
  entries,
  dividendBalance,
}: MemberOverviewSectionsProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (dateFrom && entry.date < dateFrom) return false;
        if (dateTo && entry.date > dateTo) return false;
        return true;
      }),
    [entries, dateFrom, dateTo]
  );

  const totals = useMemo(() => {
    let rawWeightKg = 0;
    let dryWeightKg = 0;
    let totalAmount = 0;
    let withdrawnAmount = 0;
    let saleCount = 0;
    const salesByEmployee = new Map<string, number>();

    for (const entry of filteredEntries) {
      if (entry.type === "PURCHASE") {
        saleCount += 1;
        rawWeightKg += entry.rawWeightKg ?? 0;
        dryWeightKg +=
          ((entry.rawWeightKg ?? 0) * (entry.dryPercentage ?? 0)) / 100;
        totalAmount += entry.totalAmount ?? 0;
        if (entry.deliveredByName && entry.employeePayout) {
          salesByEmployee.set(
            entry.deliveredByName,
            (salesByEmployee.get(entry.deliveredByName) ?? 0) +
              entry.employeePayout
          );
        }
      } else if (entry.type === "WITHDRAWAL") {
        withdrawnAmount += Math.abs(entry.amount);
      }
    }

    const employeeSales: MemberEmployeeSale[] = [...salesByEmployee.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      rawWeightKg,
      dryWeightKg,
      totalAmount,
      withdrawnAmount,
      saleCount,
      employeeSales,
    };
  }, [filteredEntries]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <Input
          label="จากวันที่"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          label="ถึงวันที่"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <ResetButton
          disabled={!dateFrom && !dateTo}
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        />
      </div>

      <LatexOverviewSection
        rawWeightKg={totals.rawWeightKg}
        dryWeightKg={totals.dryWeightKg}
        saleCount={totals.saleCount}
      />
      <FinanceOverviewSection
        totalAmount={totals.totalAmount}
        withdrawnAmount={totals.withdrawnAmount}
        employeeSales={totals.employeeSales}
      />
      <DividendCard dividendBalance={dividendBalance} entries={entries} />
    </div>
  );
}

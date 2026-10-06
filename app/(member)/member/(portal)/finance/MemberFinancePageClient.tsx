"use client";

import { useMemo, useState } from "react";
import { FinanceHistoryTable } from "@/components/member/FinanceHistoryTable";
import { MonthlyIncomeChart } from "@/components/member/MonthlyIncomeChart";
import { WalletCard } from "@/components/member/WalletCard";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetButton } from "@/components/ui/ResetButton";
import { StatCard } from "@/components/ui/StatCard";
import { DEFAULT_DATE_FROM, formatNumber, todayBangkok } from "@/lib/format";
import type { FinanceEntry, FinanceEntryType } from "@/lib/types";

const PAGE_SIZE = 10;

const TYPE_OPTIONS: { value: "ALL" | FinanceEntryType; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PURCHASE", label: "ขายน้ำยาง" },
  { value: "WITHDRAWAL", label: "เบิกเงิน" },
  { value: "DIVIDEND", label: "ปันผล" },
];

interface MemberFinancePageClientProps {
  entries: FinanceEntry[];
  walletBalance: number;
  monthlyEarnings: number;
}

export function MemberFinancePageClient({
  entries,
  walletBalance,
  monthlyEarnings,
}: MemberFinancePageClientProps) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | FinanceEntryType>(
    "ALL"
  );
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_FROM);
  const [dateTo, setDateTo] = useState(todayBangkok());
  const [page, setPage] = useState(1);

  const [prevFilters, setPrevFilters] = useState({
    typeFilter,
    dateFrom,
    dateTo,
  });
  if (
    prevFilters.typeFilter !== typeFilter ||
    prevFilters.dateFrom !== dateFrom ||
    prevFilters.dateTo !== dateTo
  ) {
    setPrevFilters({ typeFilter, dateFrom, dateTo });
    setPage(1);
  }

  const hasActiveFilters =
    typeFilter !== "ALL" ||
    dateFrom !== DEFAULT_DATE_FROM ||
    dateTo !== todayBangkok();

  function clearDateFilter() {
    setDateFrom(DEFAULT_DATE_FROM);
    setDateTo(todayBangkok());
  }

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (typeFilter !== "ALL" && entry.type !== typeFilter) return false;
        if (dateFrom && entry.date < dateFrom) return false;
        if (dateTo && entry.date > dateTo) return false;
        return true;
      }),
    [entries, typeFilter, dateFrom, dateTo]
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const totalWithdrawn = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === "WITHDRAWAL")
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0),
    [entries]
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติทางการเงิน"
        description="รายรับจากการขายน้ำยาง เงินปันผล และรายการเบิกเงินของคุณ"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <WalletCard
          balance={walletBalance}
          monthlyEarnings={monthlyEarnings}
          compact
        />
        <StatCard
          label="ยอดเงินที่เบิกไปแล้ว (บาท)"
          value={formatNumber(totalWithdrawn)}
          hint="รวมทุกรายการเบิกเงินของคุณ"
          compact
        />
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            ประเภทรายการ
          </span>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {TYPE_OPTIONS.map(({ value, label }) => {
              const active = typeFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeFilter(value)}
                  aria-pressed={active}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
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
          label="ล้างตัวกรอง"
          disabled={!hasActiveFilters}
          onClick={() => {
            setTypeFilter("ALL");
            clearDateFilter();
          }}
        />
      </div>

      {/* The chart only plots latex-sale income, so it has nothing to say
          when the list is narrowed to withdrawals or dividends. */}
      {(typeFilter === "ALL" || typeFilter === "PURCHASE") && (
        <section className="mb-8">
          <MonthlyIncomeChart
            title="รายได้จากการขายน้ำยางในแต่ละเดือน"
            entries={filteredEntries}
          />
        </section>
      )}

      <FinanceHistoryTable entries={pagedEntries} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

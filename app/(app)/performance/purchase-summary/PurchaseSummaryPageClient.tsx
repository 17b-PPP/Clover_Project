"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetButton } from "@/components/ui/ResetButton";
import { StatCard } from "@/components/ui/StatCard";
import { RecentPurchasesTable } from "@/components/performance/RecentPurchasesTable";
import {
  PurchaseTrendChart,
  type PurchaseTrendPoint,
} from "@/components/performance/PurchaseTrendChart";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { PurchaseSummaryRow } from "@/lib/types";

const PAGE_SIZE = 10;

interface PurchaseSummaryPageClientProps {
  rows: PurchaseSummaryRow[];
}

export function PurchaseSummaryPageClient({
  rows,
}: PurchaseSummaryPageClientProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [prevRange, setPrevRange] = useState({ dateFrom, dateTo });
  if (prevRange.dateFrom !== dateFrom || prevRange.dateTo !== dateTo) {
    setPrevRange({ dateFrom, dateTo });
    setPage(1);
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const day = row.recordDate.slice(0, 10);
      const matchesFrom = !dateFrom || day >= dateFrom;
      const matchesTo = !dateTo || day <= dateTo;
      return matchesFrom && matchesTo;
    });
  }, [rows, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalRawWeightKg = filtered.reduce((sum, r) => sum + r.rawWeightKg, 0);
    const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);

    const priceByDay = new Map<string, number>();
    for (const row of filtered) {
      const day = row.recordDate.slice(0, 10);
      if (!priceByDay.has(day)) priceByDay.set(day, row.marketPrice);
    }
    const dayPrices = [...priceByDay.values()];
    const avgDailyPrice =
      dayPrices.length > 0
        ? dayPrices.reduce((sum, p) => sum + p, 0) / dayPrices.length
        : 0;

    return {
      totalRawWeightKg,
      totalAmount,
      avgDailyPrice,
      billCount: filtered.length,
      memberCount: new Set(filtered.map((r) => r.memberCode)).size,
    };
  }, [filtered]);

  const dailyTrend = useMemo<PurchaseTrendPoint[]>(() => {
    const byDay = new Map<string, PurchaseTrendPoint>();
    for (const row of filtered) {
      const day = row.recordDate.slice(0, 10);
      const existing = byDay.get(day);
      if (existing) {
        existing.totalRawWeightKg += row.rawWeightKg;
      } else {
        byDay.set(day, {
          day,
          totalRawWeightKg: row.rawWeightKg,
          price: row.marketPrice,
        });
      }
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportParams = new URLSearchParams();
  if (dateFrom) exportParams.set("from", dateFrom);
  if (dateTo) exportParams.set("to", dateTo);
  const exportHref = `/api/performance/purchase-summary/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ผลประกอบการการรับซื้อน้ำยางสด"
        description="สรุปปริมาณ ราคา และยอดเงินการรับซื้อน้ำยางพารา"
        action={
          <a
            href={exportHref}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-800"
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
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
            </svg>
            พิมพ์รายงาน (Excel)
          </a>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
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

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="ปริมาณการรับซื้อรวม"
          value={`${formatNumber(summary.totalRawWeightKg)} กก.`}
          hint="น้ำหนักน้ำยางสดรวมทั้งช่วง"
        />
        <StatCard
          label="ราคาเฉลี่ยรับซื้อรายวัน"
          value={`${formatNumber(summary.avgDailyPrice)} บาท/กก.`}
          hint="เฉลี่ยจากราคากลางแต่ละวัน"
        />
        <StatCard
          label="จำนวนบิลที่ออก"
          value={formatNumber(summary.billCount, 0)}
          hint="จำนวนรายการรับซื้อ"
        />
        <StatCard
          label="จำนวนสมาชิกที่ส่ง"
          value={formatNumber(summary.memberCount, 0)}
          hint="นับตามรหัสสมาชิกไม่ซ้ำ"
        />
        <StatCard
          label="ยอดเงินรวม"
          value={formatCurrency(summary.totalAmount)}
          hint="มูลค่ารับซื้อทั้งหมด"
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          แนวโน้มรายวัน
        </h2>
        <PurchaseTrendChart data={dailyTrend} />
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          รายการรับซื้อล่าสุด
        </h2>
        <RecentPurchasesTable rows={pagedRows} />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

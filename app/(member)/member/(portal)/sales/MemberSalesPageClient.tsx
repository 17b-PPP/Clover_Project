"use client";

import { useMemo, useState } from "react";
import { MemberSalesTable } from "@/components/member/MemberSalesTable";
import { MonthlyWeightChart } from "@/components/member/MonthlyWeightChart";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetButton } from "@/components/ui/ResetButton";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface MemberSalesPageClientProps {
  purchases: Purchase[];
}

export function MemberSalesPageClient({
  purchases,
}: MemberSalesPageClientProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [prevFilters, setPrevFilters] = useState({ dateFrom, dateTo });
  if (prevFilters.dateFrom !== dateFrom || prevFilters.dateTo !== dateTo) {
    setPrevFilters({ dateFrom, dateTo });
    setPage(1);
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
  }

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((purchase) => {
        const day = purchase.recordDate.slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
        return true;
      }),
    [purchases, dateFrom, dateTo]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPurchases.length / PAGE_SIZE)
  );
  const pagedPurchases = filteredPurchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการขาย"
        description="ประวัติการขายน้ำยางพาราของคุณ พร้อมใบเสร็จรับเงินของแต่ละรายการ"
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
          onClick={clearDateFilter}
        />
      </div>

      <section className="mb-8">
        <MonthlyWeightChart
          title="น้ำหนักน้ำยางที่ขายได้ในแต่ละเดือน"
          purchases={filteredPurchases}
        />
      </section>

      <MemberSalesTable purchases={pagedPurchases} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface PurchaseHistoryPageClientProps {
  purchases: Purchase[];
}

export function PurchaseHistoryPageClient({
  purchases,
}: PurchaseHistoryPageClientProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [prevFilters, setPrevFilters] = useState({ search, dateFrom, dateTo });
  if (
    prevFilters.search !== search ||
    prevFilters.dateFrom !== dateFrom ||
    prevFilters.dateTo !== dateTo
  ) {
    setPrevFilters({ search, dateFrom, dateTo });
    setPage(1);
  }

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      const matchesSearch =
        !q ||
        [p.purchaseCode, p.ownerName, p.sellerCode]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const d = new Date(p.recordDate);
      const recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const matchesFrom = !dateFrom || recordDate >= dateFrom;
      const matchesTo = !dateTo || recordDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [purchases, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const pagedPurchases = filteredPurchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการรับซื้อน้ำยาง"
        description="ดูประวัติรายการรับซื้อน้ำยางพาราทั้งหมด"
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1">
          <Input
            label="ค้นหาประวัติ"
            placeholder="ค้นหาด้วยเลขบิล ชื่อผู้ขาย หรือรหัส"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
      </div>
      <p className="mb-4 text-xs text-slate-400">
        แสดงเฉพาะ 200 รายการล่าสุด
      </p>

      <PurchaseHistoryTable purchases={pagedPurchases} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

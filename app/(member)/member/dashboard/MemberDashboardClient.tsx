"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface MemberDashboardClientProps {
  purchases: Purchase[];
}

export function MemberDashboardClient({
  purchases,
}: MemberDashboardClientProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pagedPurchases = purchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการขายน้ำยาง"
        description="ดูประวัติการขายน้ำยางพาราของคุณ"
      />

      <PurchaseHistoryTable
        purchases={pagedPurchases}
        sellerNameKey="deliveredByName"
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

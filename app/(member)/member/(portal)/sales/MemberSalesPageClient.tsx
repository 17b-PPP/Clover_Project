"use client";

import { useState } from "react";
import { MemberSalesTable } from "@/components/member/MemberSalesTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface MemberSalesPageClientProps {
  purchases: Purchase[];
}

export function MemberSalesPageClient({
  purchases,
}: MemberSalesPageClientProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pagedPurchases = purchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการขาย"
        description="ประวัติการขายน้ำยางพาราของคุณ พร้อมใบเสร็จรับเงินของแต่ละรายการ"
      />

      <MemberSalesTable purchases={pagedPurchases} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { FinanceHistoryTable } from "@/components/member/FinanceHistoryTable";
import { WalletCard } from "@/components/member/WalletCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import type { FinanceEntry } from "@/lib/types";

const PAGE_SIZE = 10;

interface MemberFinancePageClientProps {
  entries: FinanceEntry[];
  walletBalance: number;
  memberCode: string;
}

export function MemberFinancePageClient({
  entries,
  walletBalance,
  memberCode,
}: MemberFinancePageClientProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pagedEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติทางการเงิน"
        description="รายรับจากการขายน้ำยางและรายการเบิกเงินของคุณ"
      />

      <div className="mb-8 sm:max-w-sm">
        <WalletCard balance={walletBalance} memberCode={memberCode} />
      </div>

      <FinanceHistoryTable entries={pagedEntries} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

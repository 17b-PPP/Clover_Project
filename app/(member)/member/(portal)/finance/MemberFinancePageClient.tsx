"use client";

import { useMemo, useState } from "react";
import { FinanceHistoryTable } from "@/components/member/FinanceHistoryTable";
import { WalletCard } from "@/components/member/WalletCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format";
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <WalletCard balance={walletBalance} memberCode={memberCode} />
        <StatCard
          label="ยอดเงินที่เบิกไปแล้ว (บาท)"
          value={formatNumber(totalWithdrawn)}
          hint="รวมทุกรายการเบิกเงินของคุณ"
        />
      </div>

      <FinanceHistoryTable entries={pagedEntries} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

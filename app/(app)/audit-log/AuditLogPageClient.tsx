"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { AuditLogTable } from "@/components/audit-log/AuditLogTable";
import type { AuditLogEntry } from "@/lib/types";

const PAGE_SIZE = 10;

interface AuditLogPageClientProps {
  entries: AuditLogEntry[];
}

export function AuditLogPageClient({ entries }: AuditLogPageClientProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        [e.username, e.action, e.details].join(" ").toLowerCase().includes(q);
      const entryDate = e.timestamp.slice(0, 10);
      const matchesFrom = !dateFrom || entryDate >= dateFrom;
      const matchesTo = !dateTo || entryDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [entries, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการใช้งาน"
        description="ตรวจสอบกิจกรรมของผู้ใช้งานแต่ละคนภายในระบบ"
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1">
          <Input
            label="ค้นหาประวัติ"
            placeholder="ค้นหาด้วยชื่อผู้ใช้งาน หรือ Action"
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

      <AuditLogTable entries={pagedEntries} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

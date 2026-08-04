"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { AuditLogTable } from "@/components/audit-log/AuditLogTable";
import type { AuditLogEntry } from "@/lib/types";

interface AuditLogPageClientProps {
  entries: AuditLogEntry[];
}

export function AuditLogPageClient({ entries }: AuditLogPageClientProps) {
  const [search, setSearch] = useState("");

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.username, e.action, e.details].join(" ").toLowerCase().includes(q)
    );
  }, [entries, search]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการใช้งาน"
        description="ตรวจสอบกิจกรรมของผู้ใช้งานแต่ละคนภายในระบบ"
      />

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาประวัติ"
          placeholder="ค้นหาด้วยชื่อผู้ใช้งาน หรือ Action"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <AuditLogTable entries={filteredEntries} />
    </div>
  );
}

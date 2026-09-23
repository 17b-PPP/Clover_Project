"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeThai, formatDateUtc, formatNumber } from "@/lib/format";
import type { ReferencePriceLogEntry } from "@/lib/types";

const PAGE_SIZE = 10;

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Admins think in Bangkok days, so the form defaults to today's Bangkok
// date rather than the UTC date.
function todayIso(): string {
  return bangkokDateFormatter.format(new Date());
}

interface ReferencePricePageClientProps {
  initialLog: ReferencePriceLogEntry[];
}

export function ReferencePricePageClient({
  initialLog,
}: ReferencePricePageClientProps) {
  const [log, setLog] = useState<ReferencePriceLogEntry[]>(initialLog);
  const [date, setDate] = useState(todayIso());
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setError("กรุณากรอกราคากลางให้ถูกต้อง");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reference-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, price: numericPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกราคากลางได้");
      }
      const { log: logEntry } = data as { log: ReferencePriceLogEntry };
      setLog((prev) => [logEntry, ...prev]);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <PageHeader
        title="ราคากลางประจำวัน"
        description="กำหนดราคากลางรับซื้อน้ำยางของแต่ละวัน ระบบจะเติมราคานี้ให้อัตโนมัติในหน้ารับซื้อ"
      />

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Input
          label="วันที่"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="ราคากลาง (บาท/กก.)"
          type="number"
          min={0}
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <h2 className="mb-4 mt-10 text-base font-semibold text-slate-900">
        ประวัติการบันทึกราคา
      </h2>
      {log.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          ยังไม่มีประวัติการบันทึกราคา
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell align="center">วันที่ของราคา</TableHeaderCell>
                <TableHeaderCell align="center">ราคาที่บันทึก (บาท/กก.)</TableHeaderCell>
                <TableHeaderCell align="center">บันทึกเมื่อ</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {log
                .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                .map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell align="center">{formatDateUtc(entry.date)}</TableCell>
                    <TableCell align="center">{formatNumber(entry.price)}</TableCell>
                    <TableCell align="center">
                      {formatDateTimeThai(entry.recordedAt)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(log.length / PAGE_SIZE))}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

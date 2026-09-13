"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeThai, formatDateUtc, formatNumber } from "@/lib/format";
import type { ReferencePriceEntry } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ReferencePricePageClientProps {
  initialHistory: ReferencePriceEntry[];
}

export function ReferencePricePageClient({
  initialHistory,
}: ReferencePricePageClientProps) {
  const [history, setHistory] = useState<ReferencePriceEntry[]>(initialHistory);
  const [date, setDate] = useState(todayIso());
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadRowIntoForm(entry: ReferencePriceEntry) {
    setDate(entry.date.slice(0, 10));
    setPrice(String(entry.price));
    setError(null);
  }

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
      const saved = data as ReferencePriceEntry;
      setHistory((prev) => {
        const withoutSameDay = prev.filter(
          (row) => row.date.slice(0, 10) !== saved.date.slice(0, 10)
        );
        return [saved, ...withoutSameDay].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      });
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

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          ยังไม่มีการกำหนดราคากลาง
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell align="center">วันที่</TableHeaderCell>
              <TableHeaderCell align="center">ราคากลาง (บาท/กก.)</TableHeaderCell>
              <TableHeaderCell align="center">แก้ไขล่าสุดเมื่อ</TableHeaderCell>
              <TableHeaderCell align="center">{null}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDateUtc(entry.date)}</TableCell>
                <TableCell>{formatNumber(entry.price)}</TableCell>
                <TableCell>{formatDateTimeThai(entry.updatedAt)}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => loadRowIntoForm(entry)}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    แก้ไข
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

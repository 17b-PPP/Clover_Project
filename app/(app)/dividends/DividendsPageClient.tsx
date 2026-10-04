"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import {
  MonthRangePicker,
  formatThaiMonth,
  type MonthRange,
} from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { DividendTable, type DividendRow } from "@/components/dividends/DividendTable";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { DividendData } from "@/lib/types";

const PAGE_SIZE = 10;

interface DividendsPageClientProps {
  data: DividendData;
}

export function DividendsPageClient({ data }: DividendsPageClientProps) {
  const router = useRouter();
  const years = useMemo(() => {
    const currentBuddhistYear = new Date().getUTCFullYear() + 543;
    const set = new Set<number>([currentBuddhistYear]);
    for (const purchase of data.purchases) set.add(purchase.buddhistYear);
    return [...set].sort((a, b) => b - a);
  }, [data.purchases]);

  const [year, setYear] = useState(years[0]);
  const [period, setPeriod] = useState<MonthRange>({ start: null, end: null });
  // Snapshot of the period at the time "ตกลง" was pressed, so editing the
  // pickers afterwards can't change what gets paid without recalculating.
  const [appliedPeriodLabel, setAppliedPeriodLabel] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [appliedRate, setAppliedRate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const yearAlreadyPaid = data.paidYears.includes(year);

  const dryWeightByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const purchase of data.purchases) {
      if (purchase.buddhistYear !== year) continue;
      map.set(
        purchase.memberId,
        (map.get(purchase.memberId) ?? 0) + purchase.dryWeightKg
      );
    }
    return map;
  }, [data.purchases, year]);

  const totalDryWeight = useMemo(
    () => [...dryWeightByMember.values()].reduce((sum, w) => sum + w, 0),
    [dryWeightByMember]
  );

  const rows: DividendRow[] = useMemo(() => {
    return data.members.map((member) => {
      const dryWeightKg = dryWeightByMember.get(member.memberId) ?? 0;
      return {
        memberId: member.memberId,
        memberCode: member.memberCode,
        memberName: member.memberName,
        dryWeightKg,
        amount: appliedRate === null ? 0 : dryWeightKg * appliedRate,
      };
    });
  }, [data.members, dryWeightByMember, appliedRate]);

  function handleApply(e: FormEvent) {
    e.preventDefault();
    const { start, end } = period;
    if (!start || !end) {
      setError("กรุณาเลือกเดือนเริ่มต้นและเดือนสิ้นสุดของช่วงเวลาที่จ่ายปันผล");
      return;
    }
    const value = Number(rateInput);
    if (!rateInput.trim() || Number.isNaN(value) || value <= 0) {
      setError("กรุณากรอกอัตราเงินปันผลเป็นตัวเลขมากกว่า 0");
      return;
    }
    setError(null);
    setAppliedRate(value);
    setAppliedPeriodLabel(
      `${formatThaiMonth(start)} - ${formatThaiMonth(end)}`
    );
    setPage(1);
    setPaid(false);
    setPayError(null);
  }

  async function handlePayDividend() {
    setPayError(null);
    try {
      const res = await fetch("/api/dividends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buddhistYear: year,
          periodLabel: appliedPeriodLabel,
          rate: appliedRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถจ่ายเงินปันผลได้");
      }
      setPaid(true);
      router.refresh();
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalDividend = appliedRate === null ? null : totalDryWeight * appliedRate;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="การจัดการคำนวณเงินปันผล"
        description="คำนวณเงินปันผลของสมาชิกจากน้ำหนักน้ำยางแห้งรวมในแต่ละปี"
      />

      <form
        onSubmit={handleApply}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="ประจำปี"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(1);
            }}
            className="w-40"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <MonthRangePicker
            label="ช่วงเวลาที่จ่ายปันผล"
            value={period}
            onChange={setPeriod}
            className="w-80"
          />
          <Input
            label="กำหนดอัตราเงินปันผล (บาท/กก.)"
            type="number"
            min={0}
            step="0.01"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            placeholder="เช่น 2.50"
            className="w-56"
          />
          <Button type="submit" variant="primary" className="h-[38px]">
            ตกลง
          </Button>
        </div>
        {yearAlreadyPaid && (
          <p className="mt-3 text-sm text-amber-600">
            หมายเหตุ: ปันผลประจำปี {year} มีการจ่ายไปแล้ว ยังคำนวณดูตัวเลขได้ตามปกติ
            แต่จะไม่สามารถกดจ่ายปันผลซ้ำสำหรับปีนี้ได้
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="น้ำหนักยางแห้งรวม"
          value={`${formatNumber(totalDryWeight)} กก.`}
          hint={`ประจำปี ${year}`}
        />
        <StatCard
          label="มูลค่าเงินปันผลรวม"
          value={totalDividend === null ? "-" : formatCurrency(totalDividend)}
          hint={`ประจำปี ${year}`}
        />
        <StatCard
          label="อัตราเงินปันผล"
          value={
            appliedRate === null
              ? "-"
              : `${formatNumber(appliedRate)} บาท/กก.`
          }
          hint="ต่อน้ำหนักยางแห้ง 1 กก."
        />
        <StatCard
          label="จำนวนสมาชิกทั้งหมด"
          value={formatNumber(data.members.length, 0)}
          hint="สมาชิกทั้งหมดในระบบ"
        />
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          ตารางปันผล
        </h2>
        {appliedRate === null ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
            เลือกปีและกรอกอัตราเงินปันผล จากนั้นกด &ldquo;ตกลง&rdquo; เพื่อคำนวณ
          </div>
        ) : (
          <>
            <DividendTable rows={pagedRows} rate={appliedRate} />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
            <p className="mt-4 text-sm text-slate-600">
              ช่วงเวลาที่จ่ายปันผล: {appliedPeriodLabel}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              {yearAlreadyPaid && !paid && (
                <span className="text-sm font-medium text-amber-600">
                  ปันผลประจำปี {year} จ่ายไปแล้ว ไม่สามารถจ่ายซ้ำได้
                </span>
              )}
              {paid && (
                <span className="text-sm font-medium text-emerald-700">
                  จ่ายเงินปันผลเรียบร้อยแล้ว
                </span>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={paid || yearAlreadyPaid}
                onClick={() => setConfirmOpen(true)}
              >
                จ่ายปันผล
              </Button>
            </div>
            {payError && (
              <p className="mt-3 text-right text-sm text-red-600">{payError}</p>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันการทำรายการ"
        message={`ท่านต้องการยืนยันการจ่ายเงินปันผลประจำปี ${year} หรือไม่ เมื่อยืนยันแล้วปันผลจะถูกบวกเพิ่มในยอดเงินสะสมของสมาชิกทันที และจะไม่สามารถแก้ไขหรือคำนวณปันผลปีนี้ซ้ำได้อีก`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handlePayDividend}
      />
    </div>
  );
}

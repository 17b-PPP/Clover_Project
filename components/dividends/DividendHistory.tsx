"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDateTimeThai, formatNumber } from "@/lib/format";
import type { DividendPayment } from "@/lib/types";

// One payout run — every member paid for a Buddhist year in a single
// "จ่ายปันผล" click. A year can only be paid once (enforced by
// @@unique([memberId, buddhistYear])), so the year identifies the run.
interface Payout {
  buddhistYear: number;
  periodLabel: string | null;
  rate: number;
  paidAt: string;
  totalDryWeightKg: number;
  totalAmount: number;
  payments: DividendPayment[];
}

function groupPayouts(payments: DividendPayment[]): Payout[] {
  const byYear = new Map<number, Payout>();
  for (const payment of payments) {
    let payout = byYear.get(payment.buddhistYear);
    if (!payout) {
      payout = {
        buddhistYear: payment.buddhistYear,
        periodLabel: payment.periodLabel,
        rate: payment.rate,
        paidAt: payment.createdAt,
        totalDryWeightKg: 0,
        totalAmount: 0,
        payments: [],
      };
      byYear.set(payment.buddhistYear, payout);
    }
    payout.totalDryWeightKg += payment.dryWeightKg;
    payout.totalAmount += payment.amount;
    payout.payments.push(payment);
    // Rows of one run are created a few ms apart; show when it started.
    if (payment.createdAt < payout.paidAt) payout.paidAt = payment.createdAt;
  }
  for (const payout of byYear.values()) {
    payout.payments.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
  }
  return [...byYear.values()].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

interface DividendHistoryProps {
  payments: DividendPayment[];
}

export function DividendHistory({ payments }: DividendHistoryProps) {
  const payouts = useMemo(() => groupPayouts(payments), [payments]);
  const [selected, setSelected] = useState<Payout | null>(null);

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        ประวัติการจ่ายปันผล
      </h2>

      {payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          ยังไม่มีประวัติการจ่ายปันผล
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell align="center" className="w-[18%]">
                วันที่จ่าย
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[10%]">
                ประจำปี
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[26%]">
                {/* Same box as the period cells below so the header starts
                    where the text starts. */}
                <div className="mx-auto w-56 pl-3 text-left">
                  ช่วงเวลาที่จ่ายปันผล
                </div>
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[12%]">
                อัตรา (บาท/กก.)
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[10%]">
                สมาชิก (ราย)
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[12%]">
                ยอดรวม (บาท)
              </TableHeaderCell>
              <TableHeaderCell align="center" className="w-[12%]">
                รายละเอียด
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.buddhistYear}>
                <TableCell align="center">
                  <span className="whitespace-nowrap text-slate-500">
                    {formatDateTimeThai(payout.paidAt)} น.
                  </span>
                </TableCell>
                <TableCell align="center">
                  <span className="font-medium text-slate-900">
                    {payout.buddhistYear}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <div className="mx-auto w-56 text-left">
                    {payout.periodLabel ?? (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell align="center">
                  <span className="tabular-nums">
                    {formatNumber(payout.rate)}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <span className="tabular-nums">
                    {formatNumber(payout.payments.length, 0)}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <span className="font-medium tabular-nums text-emerald-700">
                    {formatCurrency(payout.totalAmount)}
                  </span>
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => setSelected(payout)}
                  >
                    ดูรายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={`รายละเอียดการจ่ายปันผลประจำปี ${selected?.buddhistYear ?? ""}`}
        widthClassName="max-w-4xl"
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            ปิด
          </Button>
        }
      >
        {selected && (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">ช่วงเวลา</dt>
                <dd className="font-medium text-slate-900">
                  {selected.periodLabel ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">อัตรา</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatNumber(selected.rate)} บาท/กก.
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ยางแห้งรวม</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {formatNumber(selected.totalDryWeightKg)} กก.
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ยอดรวม</dt>
                <dd className="font-medium tabular-nums text-emerald-700">
                  {formatCurrency(selected.totalAmount)}
                </dd>
              </div>
            </dl>
            <div className="max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell align="center">เลขที่</TableHeaderCell>
                    <TableHeaderCell align="center">
                      <div className="mx-auto w-36 pl-3 text-left">
                        ชื่อสมาชิก
                      </div>
                    </TableHeaderCell>
                    <TableHeaderCell align="center">ยางแห้ง (กก.)</TableHeaderCell>
                    <TableHeaderCell align="center">ปันผล (บาท)</TableHeaderCell>
                    <TableHeaderCell align="center">
                      ยอดเงินสะสม ก่อน → หลัง
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell align="center">
                        <span className="text-slate-500">
                          {payment.dividendCode}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <div className="mx-auto w-36 whitespace-nowrap text-left">
                          <span className="font-medium text-slate-900">
                            {payment.memberName}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {payment.memberCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <span className="tabular-nums">
                          {formatNumber(payment.dryWeightKg)}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <span className="font-medium tabular-nums text-emerald-700">
                          {formatNumber(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <span className="whitespace-nowrap tabular-nums text-slate-500">
                          {formatNumber(payment.balanceBefore)} →{" "}
                          {formatNumber(payment.balanceAfter)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}

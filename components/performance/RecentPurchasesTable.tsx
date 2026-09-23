"use client";

import { useState } from "react";
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
import { PurchaseReceipt } from "@/components/purchases/PurchaseReceipt";
import { formatCurrency, formatDateUtc, formatNumber, formatTimeThai } from "@/lib/format";
import type { PurchaseSummaryRow } from "@/lib/types";

interface RecentPurchasesTableProps {
  rows: PurchaseSummaryRow[];
}

export function RecentPurchasesTable({ rows }: RecentPurchasesTableProps) {
  const [receipt, setReceipt] = useState<PurchaseSummaryRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบรายการรับซื้อในช่วงเวลาที่เลือก
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell align="center">วันที่/เวลา</TableHeaderCell>
            <TableHeaderCell align="center">ชื่อสมาชิก</TableHeaderCell>
            <TableHeaderCell align="center">รหัสสมาชิก</TableHeaderCell>
            <TableHeaderCell align="center">น้ำหนัก (กก.)</TableHeaderCell>
            <TableHeaderCell align="center">DRC (%)</TableHeaderCell>
            <TableHeaderCell align="center">ราคา/กก.</TableHeaderCell>
            <TableHeaderCell align="center">จำนวนเงิน</TableHeaderCell>
            <TableHeaderCell align="center">ใบเสร็จ</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell align="center">
                <span className="whitespace-nowrap text-slate-500">
                  {formatDateUtc(row.recordDate)}
                </span>
                <span className="block text-xs text-slate-400">
                  {formatTimeThai(row.createdAt)} น.
                </span>
              </TableCell>
              <TableCell align="center">
                <span className="font-medium text-slate-900">{row.memberName}</span>
              </TableCell>
              <TableCell align="center">{row.memberCode}</TableCell>
              <TableCell align="center">
                <span className="tabular-nums">{formatNumber(row.rawWeightKg)}</span>
              </TableCell>
              <TableCell align="center">
                <span className="tabular-nums">{formatNumber(row.dryPercentage)}</span>
              </TableCell>
              <TableCell align="center">
                <span className="tabular-nums">{formatNumber(row.marketPrice)}</span>
              </TableCell>
              <TableCell align="center">
                <span className="tabular-nums">{formatCurrency(row.totalAmount)}</span>
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                  onClick={() => setReceipt(row)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6 3h9l3 3v15H6z" />
                    <path d="M15 3v4h4" />
                    <path d="M9 13h6M9 17h6" />
                  </svg>
                  ใบเสร็จ
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title={`ใบเสร็จเลขที่ ${receipt?.purchaseCode ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceipt(null)}>
              ปิด
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              พิมพ์ใบเสร็จ
            </Button>
          </>
        }
      >
        {receipt && <PurchaseReceipt purchase={receipt} onScreen />}
      </Modal>

      {/* The dialog copy above lives inside a fixed-position overlay, which the
          print stylesheet can't lift out of the page cleanly — so the printable
          copy is rendered here, in normal flow, exactly as the staff pages do. */}
      {receipt && <PurchaseReceipt purchase={receipt} />}
    </>
  );
}

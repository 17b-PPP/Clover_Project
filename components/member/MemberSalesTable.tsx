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
import { formatDateUtc, formatNumber } from "@/lib/format";
import type { Purchase } from "@/lib/types";

interface MemberSalesTableProps {
  purchases: Purchase[];
}

export function MemberSalesTable({ purchases }: MemberSalesTableProps) {
  const [receipt, setReceipt] = useState<Purchase | null>(null);

  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ยังไม่มีประวัติการขายน้ำยาง
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell align="center" className="w-[13%]">
              วัน/เดือน/ปี
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[17%]">
              {/* Same box as the detail cells below so the header starts
                  where the text starts. */}
              <div className="mx-auto w-32 pl-3 text-left">รายละเอียด</div>
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[15%]">
              {/* Same box as the name cells below so the header starts where
                  the names start. */}
              <div className="mx-auto w-36 pl-3 text-left">ขายน้ำยางโดย</div>
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[14%]">
              จำนวนเงินรวม (บาท)
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[13%]">
              หักจ่ายลูกจ้าง (บาท)
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[15%]">
              ยอดเข้ากระเป๋าเงิน (บาท)
            </TableHeaderCell>
            <TableHeaderCell align="center" className="w-[13%]">
              ใบเสร็จ
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell align="center">
                <span className="whitespace-nowrap text-slate-500">
                  {formatDateUtc(purchase.recordDate)}
                </span>
              </TableCell>
              <TableCell align="center">
                <div className="mx-auto w-32 text-left">
                  <p className="text-xs tabular-nums">
                    น้ำยางสด {formatNumber(purchase.rawWeightKg)} กก.
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">
                    ยางแห้ง {formatNumber(purchase.dryWeightKg)} กก.
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">
                    ราคา {formatNumber(purchase.marketPrice)} บาท/กก.
                  </p>
                </div>
              </TableCell>
              <TableCell align="center">
                {/* Fixed-width box centered under the header, names
                    left-aligned inside it so every first letter lines up. */}
                <div className="mx-auto w-36 whitespace-nowrap text-left font-medium text-slate-900">
                  {purchase.deliveredByName}
                </div>
              </TableCell>
              <TableCell align="center">
                <span className="tabular-nums">
                  {formatNumber(purchase.totalAmount)}
                </span>
              </TableCell>
              <TableCell align="center">
                {purchase.employeePayout > 0 ? (
                  <span className="tabular-nums text-red-600">
                    -{formatNumber(purchase.employeePayout)}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell align="center">
                <span className="font-medium tabular-nums text-emerald-700">
                  {formatNumber(purchase.ownerPayout)}
                </span>
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                  onClick={() => setReceipt(purchase)}
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

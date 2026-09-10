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
            <TableHeaderCell align="center">วัน/เดือน/ปี</TableHeaderCell>
            <TableHeaderCell align="center">น้ำหนักน้ำยาง (กก.)</TableHeaderCell>
            <TableHeaderCell align="center">ขายน้ำยางโดย</TableHeaderCell>
            <TableHeaderCell align="center">จำนวนเงินรวม (บาท)</TableHeaderCell>
            <TableHeaderCell align="center">หักจ่ายลูกจ้าง</TableHeaderCell>
            <TableHeaderCell align="center">ยอดเข้ากระเป๋าเงิน</TableHeaderCell>
            <TableHeaderCell align="center">ใบเสร็จ</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>
                <span className="whitespace-nowrap text-slate-500">
                  {formatDateUtc(purchase.recordDate)}
                </span>
              </TableCell>
              <TableCell>
                <span className="tabular-nums">
                  {formatNumber(purchase.rawWeightKg)}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-slate-900">
                  {purchase.deliveredByName}
                </span>
              </TableCell>
              <TableCell>
                <span className="tabular-nums">
                  {formatNumber(purchase.totalAmount)}
                </span>
              </TableCell>
              <TableCell>
                <span className="tabular-nums text-slate-500">
                  {purchase.employeePayout > 0
                    ? `-${formatNumber(purchase.employeePayout)}`
                    : formatNumber(0)}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-medium tabular-nums text-emerald-700">
                  {formatNumber(purchase.ownerPayout)}
                </span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => setReceipt(purchase)}>
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

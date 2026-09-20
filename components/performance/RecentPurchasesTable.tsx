import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDateUtc, formatNumber, formatTimeThai } from "@/lib/format";
import type { PurchaseSummaryRow } from "@/lib/types";

interface RecentPurchasesTableProps {
  rows: PurchaseSummaryRow[];
}

export function RecentPurchasesTable({ rows }: RecentPurchasesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบรายการรับซื้อในช่วงเวลาที่เลือก
      </div>
    );
  }

  return (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatNumber } from "@/lib/format";

export interface DividendRow {
  memberId: string;
  memberCode: string;
  memberName: string;
  dryWeightKg: number;
  amount: number;
}

interface DividendTableProps {
  rows: DividendRow[];
  rate: number;
}

export function DividendTable({ rows, rate }: DividendTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่มีข้อมูลสมาชิก
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">ชื่อสมาชิก</TableHeaderCell>
          <TableHeaderCell align="center">รหัสสมาชิก</TableHeaderCell>
          <TableHeaderCell align="center">น้ำหนักน้ำยางแห้งรวม (กก.)</TableHeaderCell>
          <TableHeaderCell align="center">อัตราเงินปันผล (บาท/กก.)</TableHeaderCell>
          <TableHeaderCell align="center">จำนวนเงิน (บาท)</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.memberId}>
            <TableCell>
              <span className="font-medium text-slate-900">{row.memberName}</span>
            </TableCell>
            <TableCell>{row.memberCode}</TableCell>
            <TableCell>
              <span className="tabular-nums">{formatNumber(row.dryWeightKg)}</span>
            </TableCell>
            <TableCell>
              <span className="tabular-nums">{formatNumber(rate)}</span>
            </TableCell>
            <TableCell>
              <span className="font-medium tabular-nums text-emerald-700">
                {formatCurrency(row.amount)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

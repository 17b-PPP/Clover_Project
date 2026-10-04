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
          <TableHeaderCell align="center" className="w-[22%]">
            {/* Same box as the name cells below so the header starts where
                the names start. */}
            <div className="mx-auto w-36 pl-3 text-left">ชื่อสมาชิก</div>
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[14%]">รหัสสมาชิก</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[24%]">น้ำหนักน้ำยางแห้งรวม (กก.)</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[22%]">อัตราเงินปันผล (บาท/กก.)</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[18%]">จำนวนเงิน (บาท)</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.memberId}>
            <TableCell align="center">
              {/* Fixed-width box centered under the header, names left-aligned
                  inside it so every first letter lines up. */}
              <div className="mx-auto w-36 whitespace-nowrap text-left font-medium text-slate-900">
                {row.memberName}
              </div>
            </TableCell>
            <TableCell align="center">{row.memberCode}</TableCell>
            <TableCell align="center">
              <span className="tabular-nums">{formatNumber(row.dryWeightKg)}</span>
            </TableCell>
            <TableCell align="center">
              <span className="tabular-nums">{formatNumber(rate)}</span>
            </TableCell>
            <TableCell align="center">
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

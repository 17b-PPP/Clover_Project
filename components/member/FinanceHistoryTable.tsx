import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateUtc, formatNumber } from "@/lib/format";
import type { FinanceEntry } from "@/lib/types";

interface FinanceHistoryTableProps {
  entries: FinanceEntry[];
}

export function FinanceHistoryTable({ entries }: FinanceHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ยังไม่มีประวัติทางการเงิน
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">วัน/เดือน/ปี</TableHeaderCell>
          <TableHeaderCell align="center">ประเภทรายการ</TableHeaderCell>
          <TableHeaderCell align="center">จำนวนเงิน (บาท)</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => {
          const isIncome = entry.amount >= 0;
          const employeePayout = entry.employeePayout;
          return (
            <TableRow key={`${entry.type}-${entry.id}`}>
              <TableCell>
                <span className="whitespace-nowrap text-slate-500">
                  {formatDateUtc(entry.date)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge tone={isIncome ? "success" : "neutral"}>
                    {isIncome ? "ขายน้ำยาง" : "เบิกเงิน"}
                  </Badge>
                  <span className="text-xs text-slate-400">{entry.code}</span>
                </div>
                {entry.deliveredByName && (
                  <p className="mt-1 text-xs text-slate-500">
                    ขายโดยลูกจ้าง: {entry.deliveredByName}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={`font-medium tabular-nums ${
                    isIncome ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatNumber(Math.abs(entry.amount))}
                </span>
                {employeePayout !== undefined && (
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    หักจ่ายลูกจ้าง {formatNumber(employeePayout)} บาท
                  </p>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

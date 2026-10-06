import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeThai, formatNumber } from "@/lib/format";
import type { Withdrawal } from "@/lib/types";

interface WithdrawalHistoryTableProps {
  withdrawals: Withdrawal[];
}

export function WithdrawalHistoryTable({
  withdrawals,
}: WithdrawalHistoryTableProps) {
  if (withdrawals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบรายการเบิกเงิน
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">วันที่ทำรายการ</TableHeaderCell>
          <TableHeaderCell align="center">เลขที่รายการ</TableHeaderCell>
          <TableHeaderCell align="center">
            <div className="mx-auto w-40 pl-3 text-left">ชื่อสมาชิก</div>
          </TableHeaderCell>
          <TableHeaderCell align="center">ยอดเบิก (บาท)</TableHeaderCell>
          <TableHeaderCell align="center">
            ยอดเงินสะสม ก่อน → หลัง
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {withdrawals.map((withdrawal) => (
          <TableRow key={withdrawal.id}>
            <TableCell align="center">
              <span className="whitespace-nowrap text-slate-500">
                {formatDateTimeThai(withdrawal.createdAt)} น.
              </span>
            </TableCell>
            <TableCell align="center">
              <span className="font-medium text-slate-900">
                {withdrawal.withdrawalCode}
              </span>
            </TableCell>
            <TableCell align="center">
              <div className="mx-auto w-40 whitespace-nowrap text-left">
                <span className="font-medium text-slate-900">
                  {withdrawal.memberName}
                </span>
                <span className="block text-xs text-slate-400">
                  {withdrawal.memberCode}
                </span>
              </div>
            </TableCell>
            <TableCell align="center">
              <span className="font-medium tabular-nums text-emerald-700">
                {formatNumber(withdrawal.amount)}
              </span>
            </TableCell>
            <TableCell align="center">
              <span className="whitespace-nowrap tabular-nums text-slate-500">
                {formatNumber(withdrawal.balanceBefore)} →{" "}
                {formatNumber(withdrawal.balanceAfter)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

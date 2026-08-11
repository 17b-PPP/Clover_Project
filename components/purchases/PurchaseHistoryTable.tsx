import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Purchase } from "@/lib/types";

interface PurchaseHistoryTableProps {
  purchases: Purchase[];
}

export function PurchaseHistoryTable({ purchases }: PurchaseHistoryTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบประวัติการรับซื้อ
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">วันที่</TableHeaderCell>
          <TableHeaderCell align="center">ชื่อผู้ขาย</TableHeaderCell>
          <TableHeaderCell align="center">เลขบิล</TableHeaderCell>
          <TableHeaderCell align="center">น้ำหนักน้ำยาง (กก.)</TableHeaderCell>
          <TableHeaderCell align="center">เนื้อยางแห้ง (%)</TableHeaderCell>
          <TableHeaderCell align="center">น้ำหนักยางแห้ง (กก.)</TableHeaderCell>
          <TableHeaderCell align="center">จำนวนเงิน</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {purchases.map((purchase) => (
          <TableRow key={purchase.id}>
            <TableCell>
              <span className="whitespace-nowrap text-slate-500">
                {formatDate(purchase.recordDate)}
              </span>
            </TableCell>
            <TableCell>
              <span className="font-medium text-slate-900">
                {purchase.ownerName}
              </span>
            </TableCell>
            <TableCell>{purchase.purchaseCode}</TableCell>
            <TableCell>{purchase.rawWeightKg.toFixed(2)}</TableCell>
            <TableCell>{purchase.dryPercentage.toFixed(2)}</TableCell>
            <TableCell>{purchase.dryWeightKg.toFixed(2)}</TableCell>
            <TableCell>{formatCurrency(purchase.totalAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

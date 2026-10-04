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

const typeBadge: Record<
  FinanceEntry["type"],
  { label: string; tone: "success" | "neutral" }
> = {
  PURCHASE: { label: "ขายน้ำยาง", tone: "success" },
  DIVIDEND: { label: "เงินปันผล", tone: "success" },
  WITHDRAWAL: { label: "เบิกเงิน", tone: "neutral" },
};

// The rest of what the database recorded about each movement, one line per
// fact, so the member can see where every amount came from.
function DetailLines({ entry }: { entry: FinanceEntry }) {
  if (entry.type === "PURCHASE") {
    return (
      <>
        <p className="tabular-nums">
          น้ำยางสด {formatNumber(entry.rawWeightKg ?? 0)} กก. · DRC{" "}
          {formatNumber(entry.dryPercentage ?? 0)}%
        </p>
        <p className="text-xs tabular-nums text-slate-500">
          ราคา {formatNumber(entry.marketPrice ?? 0)} บาท/กก.
        </p>
        {entry.deliveredByName && (
          <p className="text-xs tabular-nums text-slate-500">
            ขายโดยลูกจ้าง: {entry.deliveredByName} (หักจ่าย{" "}
            {formatNumber(entry.employeePayout ?? 0)} บาท)
          </p>
        )}
      </>
    );
  }
  if (entry.type === "DIVIDEND") {
    return (
      <>
        <p>ปันผลประจำปี {entry.buddhistYear}</p>
        {entry.periodLabel && (
          <p className="text-xs text-slate-500">
            ช่วงเวลา {entry.periodLabel}
          </p>
        )}
        <p className="text-xs tabular-nums text-slate-500">
          ยางแห้ง {formatNumber(entry.dryWeightKg ?? 0)} กก. × อัตรา{" "}
          {formatNumber(entry.rate ?? 0)} บาท/กก.
        </p>
      </>
    );
  }
  return (
    <p className="tabular-nums">
      คงเหลือหลังเบิก {formatNumber(entry.balanceAfter ?? 0)} บาท
    </p>
  );
}

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
          <TableHeaderCell align="center" className="w-[16%]">
            วัน/เดือน/ปี
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[15%]">
            ประเภทรายการ
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[14%]">
            เลขที่รายการ
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[35%]">
            {/* Same box as the detail cells below so the header starts where
                the text starts. */}
            <div className="mx-auto w-72 pl-3 text-left">รายละเอียด</div>
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[20%]">
            จำนวนเงิน (บาท)
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => {
          const isIncome = entry.amount >= 0;
          return (
            <TableRow key={`${entry.type}-${entry.id}`}>
              <TableCell align="center">
                <span className="whitespace-nowrap text-slate-500">
                  {formatDateUtc(entry.date)}
                </span>
              </TableCell>
              <TableCell align="center">
                <Badge tone={typeBadge[entry.type].tone}>
                  {typeBadge[entry.type].label}
                </Badge>
              </TableCell>
              <TableCell align="center">
                <span className="text-slate-500">{entry.code}</span>
              </TableCell>
              <TableCell align="center">
                {/* Fixed-width box centered under the header, text
                    left-aligned inside it so every line starts together. */}
                <div className="mx-auto w-72 text-left">
                  <DetailLines entry={entry} />
                </div>
              </TableCell>
              <TableCell align="center">
                <span
                  className={`font-medium tabular-nums ${
                    isIncome ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatNumber(Math.abs(entry.amount))}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

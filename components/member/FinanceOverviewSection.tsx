import { InfoSectionCard, InfoStatBox } from "@/components/member/InfoSectionCard";
import { formatNumber } from "@/lib/format";
import type { MemberEmployeeSale } from "@/lib/types";

interface FinanceOverviewSectionProps {
  totalAmount: number;
  myAmount: number;
  withdrawnAmount: number;
  employeeSales: MemberEmployeeSale[];
}

export function FinanceOverviewSection({
  totalAmount,
  myAmount,
  withdrawnAmount,
  employeeSales,
}: FinanceOverviewSectionProps) {
  return (
    <InfoSectionCard title="การเงิน">
      <InfoStatBox
        label="ยอดเงินรวมที่ขายได้ (บาท)"
        value={
          <span className="flex flex-col gap-3">
            <span className="text-xl font-semibold tabular-nums text-slate-900">
              {formatNumber(totalAmount)}
            </span>
            <span className="flex flex-col gap-1 border-t border-slate-200 pt-2">
              <span className="text-xs font-medium text-slate-500">
                ยอดเงินรวมของฉัน (บาท)
              </span>
              <span className="text-xl font-semibold tabular-nums text-slate-900">
                {formatNumber(myAmount)}
              </span>
            </span>
          </span>
        }
      />
      <InfoStatBox label="ยอดเบิก (บาท)" value={formatNumber(withdrawnAmount)} />
      <InfoStatBox
        label="ยอดเงินลูกจ้าง (บาท)"
        value={
          employeeSales.length > 0 ? (
            <span className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2 text-base font-semibold text-slate-900">
                <span>รวมทั้งหมด</span>
                <span className="shrink-0 tabular-nums">
                  {formatNumber(
                    employeeSales.reduce((sum, sale) => sum + sale.amount, 0)
                  )}
                </span>
              </span>
              {employeeSales.map((sale) => (
                <span
                  key={sale.name}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="truncate text-slate-600">{sale.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {formatNumber(sale.amount)}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            "—"
          )
        }
      />
    </InfoSectionCard>
  );
}

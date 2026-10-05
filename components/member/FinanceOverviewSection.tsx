import { InfoSectionCard, InfoStatBox } from "@/components/member/InfoSectionCard";
import { formatNumber } from "@/lib/format";
import type { MemberEmployeeSale } from "@/lib/types";

interface FinanceOverviewSectionProps {
  totalAmount: number;
  withdrawnAmount: number;
  employeeSales: MemberEmployeeSale[];
}

export function FinanceOverviewSection({
  totalAmount,
  withdrawnAmount,
  employeeSales,
}: FinanceOverviewSectionProps) {
  return (
    <InfoSectionCard title="การเงิน">
      <InfoStatBox
        label="ยอดเงินรวมที่ขายได้ (บาท)"
        value={formatNumber(totalAmount)}
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

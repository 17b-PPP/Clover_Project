"use client";

import { InfoSectionCard, InfoStatBox } from "@/components/member/InfoSectionCard";
import { useYearSelector } from "@/components/member/useYearSelector";
import { formatNumber } from "@/lib/format";
import type { MemberYearlySummary } from "@/lib/types";

interface FinanceOverviewSectionProps {
  yearlySummaries: MemberYearlySummary[];
}

export function FinanceOverviewSection({
  yearlySummaries,
}: FinanceOverviewSectionProps) {
  const salesAmount = useYearSelector(yearlySummaries, "เลือกปียอดขาย");
  const withdrawn = useYearSelector(yearlySummaries, "เลือกปียอดเบิกเงิน");

  return (
    <InfoSectionCard title="การเงิน">
      <InfoStatBox
        label="ยอดเงินรวมที่ขายได้ (บาท)"
        value={formatNumber(salesAmount.selected.totalAmount)}
        hint={`ยอดขายน้ำยางรวมทั้งปี ${salesAmount.year}`}
        selector={salesAmount.selector}
      />
      <InfoStatBox
        label="ยอดเบิก (บาท)"
        value={formatNumber(withdrawn.selected.withdrawnAmount)}
        hint={`ยอดเงินที่เบิกออกจากยอดสะสมปี ${withdrawn.year}`}
        selector={withdrawn.selector}
      />
      <InfoStatBox
        label="ยอดเงินลูกจ้าง (บาท)"
        value={
          salesAmount.selected.employeeSales.length > 0 ? (
            <span className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2 text-base font-semibold text-slate-900">
                <span>รวมทั้งหมด</span>
                <span className="shrink-0 tabular-nums">
                  {formatNumber(
                    salesAmount.selected.employeeSales.reduce(
                      (sum, sale) => sum + sale.amount,
                      0
                    )
                  )}
                </span>
              </span>
              {salesAmount.selected.employeeSales.map((sale) => (
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
        hint={`ส่วนแบ่งที่จ่ายให้ลูกจ้างแต่ละคนปี ${salesAmount.year}`}
        selector={salesAmount.selector}
      />
    </InfoSectionCard>
  );
}

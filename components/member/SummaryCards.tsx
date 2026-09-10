import { formatCurrency, formatNumber } from "@/lib/format";

interface SummaryCardProps {
  label: string;
  value: string;
  hint: string;
  icon: string;
}

function SummaryCard({ label, value, hint, icon }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d={icon} />
          </svg>
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

interface SummaryCardsProps {
  monthlySalesAmount: number;
  yearlyRawWeightKg: number;
}

// Returns the cards bare, so the dashboard can lay them out in the same grid as
// the dividend and wallet cards rather than nesting one grid inside another.
export function SummaryCards({
  monthlySalesAmount,
  yearlyRawWeightKg,
}: SummaryCardsProps) {
  return (
    <>
      <SummaryCard
        label="ยอดขายรายเดือน"
        value={formatCurrency(monthlySalesAmount)}
        hint="ยอดขายน้ำยางรวมของเดือนนี้"
        icon="M3 3v18h18M8 17V10M13 17V6M18 17v-4"
      />
      <SummaryCard
        label="น้ำหนักรวมปีนี้"
        value={`${formatNumber(yearlyRawWeightKg)} กก.`}
        hint="น้ำหนักน้ำยางที่ส่งขายรวมทั้งปีนี้"
        icon="M12 3v3M7.5 6h9l3 12a2 2 0 0 1-2 2.5H6.5a2 2 0 0 1-2-2.5l3-12Z"
      />
    </>
  );
}

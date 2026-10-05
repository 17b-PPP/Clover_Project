"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import type { Purchase } from "@/lib/types";

const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function monthLabel(monthKey: string): string {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

interface MonthlyWeightChartProps {
  title: string;
  purchases: Purchase[];
  selectedMonth?: string | null;
  onSelectMonth?: (monthKey: string) => void;
  onBack?: () => void;
}

export function MonthlyWeightChart({
  title,
  purchases,
  selectedMonth,
  onSelectMonth,
  onBack,
}: MonthlyWeightChartProps) {
  const byMonth = new Map<string, number>();
  for (const purchase of purchases) {
    const monthKey = purchase.recordDate.slice(0, 7);
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + purchase.rawWeightKg);
  }
  const data = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rawWeightKg]) => ({ month, rawWeightKg }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {selectedMonth && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="กลับไปดูภาพรวมทุกเดือน"
            title="กลับไปดูภาพรวมทุกเดือน"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
          ไม่มีข้อมูลในช่วงเวลาที่เลือก
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickFormatter={monthLabel}
                tick={{ fontSize: 12, fill: "#64748b" }}
                label={{
                  value: "เดือน",
                  position: "insideBottom",
                  offset: -8,
                  fontSize: 12,
                  fill: "#64748b",
                }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                label={{
                  value: "น้ำหนักน้ำยางสด (กก.)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                  fill: "#64748b",
                }}
              />
              <Tooltip
                labelFormatter={(label) =>
                  typeof label === "string" ? monthLabel(label) : label
                }
                formatter={(value) =>
                  typeof value === "number"
                    ? [`${formatNumber(value)} กก.`, "น้ำหนักน้ำยางสด"]
                    : [String(value), "น้ำหนักน้ำยางสด"]
                }
              />
              <Bar
                dataKey="rawWeightKg"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                cursor={onSelectMonth ? "pointer" : undefined}
                onClick={(bar) => onSelectMonth?.(bar.payload.month)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {onSelectMonth && !selectedMonth && data.length > 0 && (
        <p className="mt-2 text-center text-xs text-slate-400">
          คลิกที่แท่งกราฟเพื่อดูข้อมูลของเดือนนั้นในตารางด้านล่าง
        </p>
      )}
    </div>
  );
}

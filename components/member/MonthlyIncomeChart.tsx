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
import type { FinanceEntry } from "@/lib/types";

const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function monthLabel(monthKey: string): string {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

interface MonthlyIncomeChartProps {
  title: string;
  entries: FinanceEntry[];
}

export function MonthlyIncomeChart({
  title,
  entries,
}: MonthlyIncomeChartProps) {
  const sales = entries.filter((entry) => entry.type === "PURCHASE");

  const byMonth = new Map<string, number>();
  for (const sale of sales) {
    const monthKey = sale.date.slice(0, 7);
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + sale.amount);
  }
  const data = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, income]) => ({ month, income }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>

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
                  value: "รายได้จากการขาย (บาท)",
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
                    ? [`${formatNumber(value)} บาท`, "รายได้จากการขายน้ำยาง"]
                    : [String(value), "รายได้จากการขายน้ำยาง"]
                }
              />
              <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

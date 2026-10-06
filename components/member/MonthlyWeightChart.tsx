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
}

export function MonthlyWeightChart({
  title,
  purchases,
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
              <Bar dataKey="rawWeightKg" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

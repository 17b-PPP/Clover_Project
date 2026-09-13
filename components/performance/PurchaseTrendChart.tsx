import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateUtc, formatNumber } from "@/lib/format";

export interface PurchaseTrendPoint {
  day: string;
  totalRawWeightKg: number;
  price: number;
}

interface PurchaseTrendChartProps {
  data: PurchaseTrendPoint[];
}

function dayTickFormatter(day: string): string {
  return formatDateUtc(`${day}T00:00:00.000Z`);
}

function dayLabelFormatter(label: ReactNode): ReactNode {
  return typeof label === "string" ? dayTickFormatter(label) : label;
}

function valueFormatter(value: unknown): ReactNode {
  return typeof value === "number" ? formatNumber(value) : String(value);
}

export function PurchaseTrendChart({ data }: PurchaseTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่มีข้อมูลในช่วงเวลาที่เลือก
      </div>
    );
  }

  return (
    <div className="h-72 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tickFormatter={dayTickFormatter}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fontSize: 12, fill: "#64748b" }}
            label={{
              value: "กก.",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: "#64748b",
            }}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tick={{ fontSize: 12, fill: "#64748b" }}
            label={{
              value: "บาท/กก.",
              angle: 90,
              position: "insideRight",
              fontSize: 12,
              fill: "#64748b",
            }}
          />
          <Tooltip
            labelFormatter={dayLabelFormatter}
            formatter={valueFormatter}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="weight"
            dataKey="totalRawWeightKg"
            name="น้ำหนักรวม (กก.)"
            fill="#059669"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="ราคาเฉลี่ย (บาท/กก.)"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

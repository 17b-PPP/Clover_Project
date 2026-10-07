// =============================================================================
// public/js/charts/monthly-bar-chart.js
// -----------------------------------------------------------------------------
// กราฟแท่งรายเดือนของพอร์ทัลสมาชิก (ใช้ React + recharts)
//   - หน้าประวัติการขาย     : "น้ำหนักน้ำยางที่ขายได้ในแต่ละเดือน" (MonthlyWeightChart เดิม)
//   - หน้าประวัติทางการเงิน : "รายได้จากการขายน้ำยางในแต่ละเดือน" (MonthlyIncomeChart เดิม)
// ทั้งสองกราฟหน้าตาเหมือนกัน ต่างกันแค่ข้อมูล/ข้อความ จึงรวมเป็นไฟล์เดียว
// และเป็นกราฟสำหรับดูอย่างเดียว (คลิกไม่ได้)
// =============================================================================

import {
  React,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "/vendor/react-recharts.js";
import { formatNumber } from "/shared/format.js";
import { createChartRoot } from "./react-chart-root.js";

const h = React.createElement;

// ชื่อเดือนแบบย่อ + ปี 2 หลัก เช่น "2026-10" → "ต.ค. 69"
const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function monthLabel(monthKey) {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

const tickStyle = { fontSize: 12, fill: "#64748b" };

// รวมค่ารายการตามเดือน แล้วเรียงเดือนจากเก่าไปใหม่
// items = รายการข้อมูล, dateOf(item) = วันที่ "YYYY-MM-DD...", valueOf(item) = ค่าที่จะรวม
// valueKey = ชื่อฟิลด์ของค่าที่รวมแล้ว (เช่น "rawWeightKg" หรือ "income")
export function groupByMonth(items, dateOf, valueOf, valueKey) {
  const byMonth = new Map();
  for (const item of items) {
    const monthKey = dateOf(item).slice(0, 7);
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + valueOf(item));
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, [valueKey]: value }));
}

// emptyElement = กล่อง "ไม่มีข้อมูลในช่วงเวลาที่เลือก"
// chartElement = กล่องสูง 18rem ที่จะวาดกราฟ
// valueKey     = ชื่อฟิลด์ของค่าในข้อมูล (เช่น "rawWeightKg")
// yAxisLabel   = ชื่อแกนตั้ง, unit = หน่วยใน tooltip, seriesName = ชื่อข้อมูลใน tooltip
export function createMonthlyBarChart(
  emptyElement,
  chartElement,
  { valueKey, yAxisLabel, unit, seriesName }
) {
  const root = createChartRoot(chartElement);

  return {
    // data = [{ month: "YYYY-MM", [valueKey]: ตัวเลข }, ...]
    render(data) {
      if (data.length === 0) {
        root.unmount();
        chartElement.hidden = true;
        emptyElement.hidden = false;
        return;
      }
      emptyElement.hidden = true;
      chartElement.hidden = false;

      root.render(
        h(
          ResponsiveContainer,
          { width: "100%", height: "100%" },
          h(
            BarChart,
            { data, margin: { top: 8, right: 8, left: 0, bottom: 20 } },
            h(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", vertical: false }),
            h(XAxis, {
              dataKey: "month",
              tickFormatter: monthLabel,
              tick: tickStyle,
              label: {
                value: "เดือน",
                position: "insideBottom",
                offset: -8,
                fontSize: 12,
                fill: "#64748b",
              },
            }),
            h(YAxis, {
              tick: tickStyle,
              label: {
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
                fill: "#64748b",
              },
            }),
            h(Tooltip, {
              labelFormatter: (label) => (typeof label === "string" ? monthLabel(label) : label),
              formatter: (value) =>
                typeof value === "number"
                  ? [`${formatNumber(value)} ${unit}`, seriesName]
                  : [String(value), seriesName],
            }),
            h(Bar, { dataKey: valueKey, fill: "#059669", radius: [4, 4, 0, 0] })
          )
        )
      );
    },
  };
}

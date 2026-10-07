// =============================================================================
// public/js/charts/purchase-trend-chart.js
// -----------------------------------------------------------------------------
// กราฟ "แนวโน้มรายวัน" ในหน้าผลประกอบการรับซื้อน้ำยาง (ใช้ React + recharts)
//   - แท่งสีเขียว : น้ำหนักน้ำยางสดรวมของวัน (แกนซ้าย หน่วย กก.)
//   - เส้นสีส้ม   : ราคาของวันนั้น (แกนขวา หน่วย บาท/กก.)
//
// HTML ที่ใช้: กล่องว่าง (ไม่มีข้อมูล) + กล่องกราฟ — ไฟล์นี้สลับการแสดงผลให้
// =============================================================================

import {
  React,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "/vendor/react-recharts.js";
import { formatDateUtc, formatNumber } from "/shared/format.js";
import { createChartRoot } from "./react-chart-root.js";

const h = React.createElement;

// "2026-10-07" → "7 ต.ค. 2569" (ป้ายแกน X)
function dayTickFormatter(day) {
  return formatDateUtc(`${day}T00:00:00.000Z`);
}

// หัวข้อของกล่อง tooltip
function dayLabelFormatter(label) {
  return typeof label === "string" ? dayTickFormatter(label) : label;
}

// ตัวเลขใน tooltip
function valueFormatter(value) {
  return typeof value === "number" ? formatNumber(value) : String(value);
}

// สีและรูปแบบตัวอักษรของแกน (เหมือนของเดิม)
const tickStyle = { fontSize: 12, fill: "#64748b" };

// emptyElement = กล่อง "ไม่มีข้อมูลในช่วงเวลาที่เลือก"
// chartElement = กล่องที่จะวาดกราฟลงไป
export function createPurchaseTrendChart(emptyElement, chartElement) {
  const root = createChartRoot(chartElement);

  return {
    // data = [{ day: "YYYY-MM-DD", totalRawWeightKg, price }, ...]
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
            ComposedChart,
            { data, margin: { top: 8, right: 8, left: 0, bottom: 8 } },
            h(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0" }),
            h(XAxis, { dataKey: "day", tickFormatter: dayTickFormatter, tick: tickStyle }),
            h(YAxis, {
              yAxisId: "weight",
              tick: tickStyle,
              label: {
                value: "กก.",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
                fill: "#64748b",
              },
            }),
            h(YAxis, {
              yAxisId: "price",
              orientation: "right",
              tick: tickStyle,
              label: {
                value: "บาท/กก.",
                angle: 90,
                position: "insideRight",
                fontSize: 12,
                fill: "#64748b",
              },
            }),
            h(Tooltip, { labelFormatter: dayLabelFormatter, formatter: valueFormatter }),
            h(Legend, { wrapperStyle: { fontSize: 12 } }),
            h(Bar, {
              yAxisId: "weight",
              dataKey: "totalRawWeightKg",
              name: "น้ำหนักรวม (กก.)",
              fill: "#059669",
              radius: [4, 4, 0, 0],
            }),
            h(Line, {
              yAxisId: "price",
              type: "monotone",
              dataKey: "price",
              name: "ราคาเฉลี่ย (บาท/กก.)",
              stroke: "#b45309",
              strokeWidth: 2,
              dot: { r: 3 },
            })
          )
        )
      );
    },
  };
}

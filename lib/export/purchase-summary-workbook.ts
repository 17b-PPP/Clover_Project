import ExcelJS from "exceljs";
import { formatDateUtc, formatTimeThai } from "@/lib/format";
import type { PurchaseSummaryRow } from "@/lib/types";

export interface PurchaseSummaryRange {
  from: string;
  to: string;
}

const MONEY_FMT = "#,##0.00";
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF047857" },
};

function computeSummary(rows: PurchaseSummaryRow[]) {
  const totalRawWeightKg = rows.reduce((sum, r) => sum + r.rawWeightKg, 0);
  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);

  const priceByDay = new Map<string, number>();
  for (const row of rows) {
    const day = row.recordDate.slice(0, 10);
    if (!priceByDay.has(day)) priceByDay.set(day, row.marketPrice);
  }
  const dayPrices = [...priceByDay.values()];
  const avgDailyPrice =
    dayPrices.length > 0
      ? dayPrices.reduce((sum, p) => sum + p, 0) / dayPrices.length
      : 0;

  return {
    totalRawWeightKg,
    totalAmount,
    avgDailyPrice,
    billCount: rows.length,
    memberCount: new Set(rows.map((r) => r.memberCode)).size,
  };
}

// Builds the "ผลประกอบการการรับซื้อน้ำยางสด" report as an .xlsx workbook:
// a summary sheet with the same five KPIs shown on screen, plus a detail sheet
// listing every purchase in the selected date range.
export async function buildPurchaseSummaryWorkbook(
  rows: PurchaseSummaryRow[],
  range: PurchaseSummaryRange
): Promise<ArrayBuffer> {
  const summary = computeSummary(rows);
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const rangeLabel =
    range.from || range.to
      ? `${range.from || "เริ่มต้น"} ถึง ${range.to || "ปัจจุบัน"}`
      : "ทั้งหมด";

  // --- Summary sheet ---------------------------------------------------------
  const overview = workbook.addWorksheet("สรุปผลประกอบการ");
  overview.columns = [{ width: 32 }, { width: 22 }];

  overview.addRow(["รายงานผลประกอบการการรับซื้อน้ำยางสด"]);
  overview.getRow(1).font = { bold: true, size: 14 };
  overview.addRow(["ช่วงเวลา", rangeLabel]);
  overview.addRow(["พิมพ์เมื่อ", formatDateUtc(new Date().toISOString()) + " " + formatTimeThai(new Date().toISOString()) + " น."]);
  overview.addRow([]);

  const kpiHeader = overview.addRow(["รายการ", "ค่า"]);
  kpiHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kpiHeader.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });

  const kpis: [string, number, string][] = [
    ["ปริมาณการรับซื้อรวม (กก.)", summary.totalRawWeightKg, MONEY_FMT],
    ["ราคาเฉลี่ยรับซื้อรายวัน (บาท/กก.)", summary.avgDailyPrice, MONEY_FMT],
    ["จำนวนบิลที่ออก", summary.billCount, "#,##0"],
    ["จำนวนสมาชิกที่ส่ง", summary.memberCount, "#,##0"],
    ["ยอดเงินรวม (บาท)", summary.totalAmount, MONEY_FMT],
  ];
  for (const [label, value, fmt] of kpis) {
    const row = overview.addRow([label, value]);
    row.getCell(2).numFmt = fmt;
  }

  // --- Detail sheet --------------------------------------------------------
  const detail = workbook.addWorksheet("รายการรับซื้อ");
  detail.columns = [
    { header: "วันที่", key: "date", width: 16 },
    { header: "เวลา", key: "time", width: 10 },
    { header: "ชื่อสมาชิก", key: "memberName", width: 26 },
    { header: "รหัสสมาชิก", key: "memberCode", width: 14 },
    { header: "น้ำหนัก (กก.)", key: "rawWeightKg", width: 14 },
    { header: "DRC (%)", key: "dryPercentage", width: 10 },
    { header: "ราคา/กก. (บาท)", key: "marketPrice", width: 14 },
    { header: "จำนวนเงิน (บาท)", key: "totalAmount", width: 16 },
  ];

  const headerRow = detail.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });

  for (const row of rows) {
    detail.addRow({
      date: formatDateUtc(row.recordDate),
      time: formatTimeThai(row.createdAt),
      memberName: row.memberName,
      memberCode: row.memberCode,
      rawWeightKg: row.rawWeightKg,
      dryPercentage: row.dryPercentage,
      marketPrice: row.marketPrice,
      totalAmount: row.totalAmount,
    });
  }

  for (const col of ["rawWeightKg", "marketPrice", "totalAmount"]) {
    detail.getColumn(col).numFmt = MONEY_FMT;
  }
  detail.getColumn("dryPercentage").numFmt = "0.00";

  if (rows.length > 0) {
    const totalRow = detail.addRow({
      memberName: "รวม",
      rawWeightKg: summary.totalRawWeightKg,
      totalAmount: summary.totalAmount,
    });
    totalRow.font = { bold: true };
    totalRow.getCell("rawWeightKg").numFmt = MONEY_FMT;
    totalRow.getCell("totalAmount").numFmt = MONEY_FMT;
  }

  detail.views = [{ state: "frozen", ySplit: 1 }];
  detail.autoFilter = { from: "A1", to: "H1" };

  return workbook.xlsx.writeBuffer();
}

import { NextRequest, NextResponse } from "next/server";
import { getPurchaseSummaryRows } from "@/lib/data/purchase-summary";
import { buildPurchaseSummaryWorkbook } from "@/lib/export/purchase-summary-workbook";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    const rows = (await getPurchaseSummaryRows()).filter((row) => {
      const day = row.recordDate.slice(0, 10);
      return (!from || day >= from) && (!to || day <= to);
    });

    const workbook = await buildPurchaseSummaryWorkbook(rows, { from, to });

    const stamp = new Date().toISOString().slice(0, 10);
    const asciiName = `purchase-performance-${stamp}.xlsx`;
    const thaiName = `รายงานผลประกอบการรับซื้อน้ำยางสด_${stamp}.xlsx`;

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          thaiName
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

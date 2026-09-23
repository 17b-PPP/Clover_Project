import { NextRequest, NextResponse } from "next/server";
import { payDividend, DividendError } from "@/lib/data/dividends";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";
import type { DividendPaymentInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DividendPaymentInput>;

    if (
      body.buddhistYear === undefined ||
      body.buddhistYear === null ||
      body.month === undefined ||
      body.month === null ||
      body.rate === undefined ||
      body.rate === null
    ) {
      return NextResponse.json(
        { error: "กรุณาระบุปี เดือน และอัตราเงินปันผลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const payments = await payDividend({
      buddhistYear: body.buddhistYear,
      month: body.month,
      rate: body.rate,
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    await logActivity({
      action: "CREATE_DIVIDEND",
      targetType: "DIVIDEND",
      description: `จ่ายเงินปันผลประจำ${
        body.month === 0 ? "ปี" : `เดือน ${body.month}`
      } ${body.buddhistYear} อัตรา ${body.rate} บาท/กก. ให้สมาชิก ${
        payments.length
      } ราย รวม ${totalAmount} บาท`,
    });

    return NextResponse.json(payments, { status: 201 });
  } catch (error) {
    if (error instanceof DividendError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}

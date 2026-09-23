import { NextRequest, NextResponse } from "next/server";
import {
  getReferencePriceForDate,
  upsertReferencePrice,
} from "@/lib/data/reference-price";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";
import { formatDateUtc } from "@/lib/format";

// Lets the purchase page poll for the current day's reference price, so an
// admin edit propagates there live without depending on the padlock state.
export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date || Number.isNaN(new Date(date).getTime())) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่ให้ถูกต้อง" },
        { status: 400 }
      );
    }
    const entry = await getReferencePriceForDate(date);
    return NextResponse.json({ price: entry?.price ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { date?: string; price?: number };

    if (!body.date || body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "กรุณากรอกวันที่และราคาให้ครบถ้วน" },
        { status: 400 }
      );
    }
    if (Number.isNaN(new Date(body.date).getTime())) {
      return NextResponse.json(
        { error: "รูปแบบวันที่ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    if (typeof body.price !== "number" || body.price <= 0) {
      return NextResponse.json(
        { error: "ราคากลางต้องเป็นตัวเลขที่มากกว่า 0" },
        { status: 400 }
      );
    }

    const { entry, log } = await upsertReferencePrice(body.date, body.price);

    await logActivity({
      action: "UPDATE_REFERENCE_PRICE",
      targetType: "REFERENCE_PRICE",
      targetId: entry.id,
      description: `บันทึกราคากลางประจำวันที่ ${formatDateUtc(entry.date)} เป็น ${entry.price} บาท/กก.`,
    });

    return NextResponse.json({ ...entry, log }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { upsertReferencePrice } from "@/lib/data/reference-price";
import { handleRouteError } from "@/lib/api-error";

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

    const entry = await upsertReferencePrice(body.date, body.price);
    return NextResponse.json(entry, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

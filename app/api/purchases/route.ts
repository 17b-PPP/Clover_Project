import { NextRequest, NextResponse } from "next/server";
import {
  createPurchase,
  getPurchases,
  SellerLookupError,
} from "@/lib/data/purchases";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";
import type { PurchaseInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getPurchases());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PurchaseInput>;

    const requiredFields: (keyof PurchaseInput)[] = [
      "recordDate",
      "marketPrice",
      "sellerCode",
      "rawWeightKg",
      "dryPercentage",
    ];
    const missing = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null || body[field] === ""
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.marketPrice! <= 0 || body.rawWeightKg! <= 0) {
      return NextResponse.json(
        { error: "ราคากลางและน้ำหนักน้ำยางสดต้องมากกว่า 0" },
        { status: 400 }
      );
    }
    if (body.dryPercentage! <= 0 || body.dryPercentage! > 100) {
      return NextResponse.json(
        { error: "เนื้อยางแห้งต้องอยู่ระหว่าง 0-100%" },
        { status: 400 }
      );
    }

    const purchase = await createPurchase({
      recordDate: body.recordDate!,
      marketPrice: body.marketPrice!,
      sellerCode: body.sellerCode!,
      rawWeightKg: body.rawWeightKg!,
      dryPercentage: body.dryPercentage!,
    });

    await logActivity({
      action: "CREATE_PURCHASE",
      targetType: "PURCHASE",
      targetId: purchase.id,
      description: `บันทึกรับซื้อน้ำยาง ${purchase.purchaseCode} จาก ${purchase.sellerCode} (${purchase.deliveredByName}) น้ำหนักยางแห้ง ${purchase.dryWeightKg} กก. รวม ${purchase.totalAmount} บาท`,
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof SellerLookupError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}

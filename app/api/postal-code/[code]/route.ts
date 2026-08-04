import { NextRequest, NextResponse } from "next/server";
import { lookupPostalCode } from "@/lib/thai-address";
import { handleRouteError } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    return NextResponse.json(lookupPostalCode(code));
  } catch (error) {
    return handleRouteError(error);
  }
}

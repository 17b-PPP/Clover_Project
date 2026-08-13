import { NextRequest, NextResponse } from "next/server";
import { lookupSeller, SellerLookupError } from "@/lib/data/purchases";
import { handleRouteError } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const preferredMemberId =
      request.nextUrl.searchParams.get("memberId") ?? undefined;
    const seller = await lookupSeller(decodeURIComponent(code), preferredMemberId);
    return NextResponse.json(seller);
  } catch (error) {
    if (error instanceof SellerLookupError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return handleRouteError(error);
  }
}

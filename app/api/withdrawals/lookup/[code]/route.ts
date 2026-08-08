import { NextRequest, NextResponse } from "next/server";
import { lookupMember, WithdrawalError } from "@/lib/data/withdrawals";
import { handleRouteError } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const member = await lookupMember(decodeURIComponent(code));
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return handleRouteError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getContractHistory } from "@/lib/data/contracts";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const memberId = request.nextUrl.searchParams.get("memberId");
    const employeeId = request.nextUrl.searchParams.get("employeeId");

    if (!memberId || !employeeId) {
      return NextResponse.json(
        { error: "Missing required query params: memberId, employeeId" },
        { status: 400 }
      );
    }

    return NextResponse.json(await getContractHistory(memberId, employeeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

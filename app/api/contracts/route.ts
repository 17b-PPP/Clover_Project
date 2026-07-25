import { NextRequest, NextResponse } from "next/server";
import { createContract, getContracts } from "@/lib/data/contracts";
import { handleRouteError } from "@/lib/api-error";
import type { ContractInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getContracts());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ContractInput>;

    const requiredFields: (keyof ContractInput)[] = [
      "memberId",
      "employeeId",
      "memberShare",
      "employeeShare",
    ];
    const missing = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const contract = await createContract({
      memberId: body.memberId!,
      employeeId: body.employeeId!,
      memberShare: body.memberShare!,
      employeeShare: body.employeeShare!,
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

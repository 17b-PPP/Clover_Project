import { NextRequest, NextResponse } from "next/server";
import { createMember, getMembers } from "@/lib/data/members";
import { handleRouteError } from "@/lib/api-error";
import type { MemberInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getMembers());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<MemberInput>;

    const requiredFields: (keyof MemberInput)[] = [
      "firstName",
      "lastName",
      "idCardNumber",
      "phone",
      "address",
      "postalCode",
    ];
    const missing = requiredFields.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const member = await createMember({
      firstName: body.firstName!,
      lastName: body.lastName!,
      idCardNumber: body.idCardNumber!,
      phone: body.phone!,
      address: body.address!,
      postalCode: body.postalCode!,
      photoUrl: body.photoUrl ?? null,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

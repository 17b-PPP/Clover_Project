import { NextRequest, NextResponse } from "next/server";
import { createMember, getMembers } from "@/lib/data/members";
import type { MemberInput } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getMembers());
}

export async function POST(request: NextRequest) {
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
}

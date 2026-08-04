import { NextRequest, NextResponse } from "next/server";
import { createMember, getMembers } from "@/lib/data/members";
import { handleRouteError } from "@/lib/api-error";
import { isValidIdCardNumber, isValidPhone } from "@/lib/validate";
import { logActivity } from "@/lib/activity-log";
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
      "dateOfBirth",
      "phone",
      "address",
      "district",
      "province",
      "postalCode",
    ];
    const missing = requiredFields.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidIdCardNumber(body.idCardNumber!)) {
      return NextResponse.json(
        { error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" },
        { status: 400 }
      );
    }
    if (!isValidPhone(body.phone!)) {
      return NextResponse.json(
        { error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" },
        { status: 400 }
      );
    }

    const member = await createMember({
      firstName: body.firstName!,
      lastName: body.lastName!,
      idCardNumber: body.idCardNumber!,
      dateOfBirth: body.dateOfBirth!,
      phone: body.phone!,
      address: body.address!,
      district: body.district!,
      province: body.province!,
      postalCode: body.postalCode!,
      photoUrl: body.photoUrl ?? null,
      gardenName: body.gardenName ?? null,
    });

    await logActivity({
      action: "CREATE_MEMBER",
      targetType: "MEMBER",
      targetId: member.id,
      description: `เพิ่มสมาชิกใหม่ ${member.memberCode} (${member.firstName} ${member.lastName})`,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

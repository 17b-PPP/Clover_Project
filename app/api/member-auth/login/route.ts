import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMemberSessionCookie } from "@/lib/member-session";
import { handleRouteError } from "@/lib/api-error";

// Converts an 8-digit DDMMYYYY string (as typed on the member login form)
// into a YYYY-MM-DD string comparable against dateOfBirth.toISOString().
// Returns null for anything that isn't exactly 8 digits — no calendar
// validation beyond that, since an invalid value just fails to match below.
function parseDdmmyyyy(input: string): string | null {
  if (!/^\d{8}$/.test(input)) return null;
  const day = input.slice(0, 2);
  const month = input.slice(2, 4);
  const year = input.slice(4, 8);
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const { idCardNumber, dateOfBirth } = (await request.json()) as {
      idCardNumber?: string;
      dateOfBirth?: string;
    };

    if (!idCardNumber || !dateOfBirth) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขบัตรประชาชนและวันเกิด" },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { idCardNumber },
    });

    const parsedDob = parseDdmmyyyy(dateOfBirth);
    const dobMatches =
      member !== null &&
      parsedDob !== null &&
      member.dateOfBirth.toISOString().slice(0, 10) === parsedDob;

    if (!member || !dobMatches) {
      return NextResponse.json(
        { error: "เลขบัตรประชาชนหรือวันเกิดไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (member.status !== "Active") {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    await createMemberSessionCookie({
      memberId: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
    });

    return NextResponse.json({
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

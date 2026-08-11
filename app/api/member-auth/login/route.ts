import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMemberSessionCookie } from "@/lib/member-session";
import { handleRouteError } from "@/lib/api-error";

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

    const dobMatches =
      member !== null &&
      member.dateOfBirth.toISOString().slice(0, 10) === dateOfBirth;

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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({ where: { username } });

    if (!staff || !verifyPassword(password, staff.password)) {
      if (staff) {
        await prisma.activityLog.create({
          data: {
            staffId: staff.id,
            action: "LOGIN_FAILED",
            status: "FAILED",
            description: "เข้าสู่ระบบไม่สำเร็จ (รหัสผ่านไม่ถูกต้อง)",
          },
        });
      }
      return NextResponse.json(
        { error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (staff.status !== "Active") {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    await createSessionCookie({
      staffId: staff.id,
      username: staff.username,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
    });

    await prisma.activityLog.create({
      data: {
        staffId: staff.id,
        action: "LOGIN",
        status: "SUCCESS",
        description: "เข้าสู่ระบบสำเร็จ",
      },
    });

    return NextResponse.json({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      username: staff.username,
      role: staff.role,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.staffId },
    });
    if (!staff || !verifyPassword(currentPassword, staff.password)) {
      return NextResponse.json(
        { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        password: hashPassword(newPassword),
        usingDefaultPassword: false,
      },
    });

    await logActivity({
      action: "UPDATE_STAFF",
      targetType: "STAFF",
      targetId: staff.id,
      description: `เปลี่ยนรหัสผ่านของตนเอง (${staff.username})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

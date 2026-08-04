import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUser, setUserStatus, updateUser } from "@/lib/data/users";
import { handleRouteError } from "@/lib/api-error";
import { isValidPhone } from "@/lib/validate";
import { logActivity } from "@/lib/activity-log";
import type { UserInput, UserStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getUser(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<UserInput> & {
      status?: UserStatus;
    };

    if (body.status) {
      const updated = await setUserStatus(id, body.status);
      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      await logActivity({
        action: "SUSPEND_STAFF",
        targetType: "STAFF",
        targetId: updated.id,
        description: `${
          body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
        }ผู้ใช้งาน ${updated.username} (${updated.firstName} ${updated.lastName})`,
      });
      return NextResponse.json(updated);
    }

    if (body.phone && !isValidPhone(body.phone)) {
      return NextResponse.json(
        { error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" },
        { status: 400 }
      );
    }

    const updated = await updateUser(id, body);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    await logActivity({
      action: "UPDATE_STAFF",
      targetType: "STAFF",
      targetId: updated.id,
      description: `แก้ไขข้อมูลผู้ใช้งาน ${updated.username} (${updated.firstName} ${updated.lastName})`,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้งานหรืออีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 }
      );
    }
    return handleRouteError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createUser, getUsers } from "@/lib/data/users";
import { handleRouteError } from "@/lib/api-error";
import { isValidPhone } from "@/lib/validate";
import { logActivity } from "@/lib/activity-log";
import type { UserInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getUsers());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<UserInput>;

    const requiredFields: (keyof UserInput)[] = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "username",
      "role",
      "password",
    ];
    const missing = requiredFields.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidPhone(body.phone!)) {
      return NextResponse.json(
        { error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" },
        { status: 400 }
      );
    }

    try {
      const user = await createUser({
        firstName: body.firstName!,
        lastName: body.lastName!,
        phone: body.phone!,
        email: body.email!,
        username: body.username!,
        role: body.role!,
        password: body.password!,
      });
      await logActivity({
        action: "CREATE_STAFF",
        targetType: "STAFF",
        targetId: user.id,
        description: `เพิ่มผู้ใช้งานใหม่ ${user.username} (${user.firstName} ${user.lastName})`,
      });
      return NextResponse.json(user, { status: 201 });
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
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

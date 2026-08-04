import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroySessionCookie, getSession } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      await prisma.activityLog.create({
        data: {
          staffId: session.staffId,
          action: "LOGOUT",
          status: "SUCCESS",
          description: "ออกจากระบบ",
        },
      });
    }
    await destroySessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

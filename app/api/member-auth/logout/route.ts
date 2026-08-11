import { NextResponse } from "next/server";
import { destroyMemberSessionCookie } from "@/lib/member-session";
import { handleRouteError } from "@/lib/api-error";

export async function POST() {
  try {
    await destroyMemberSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

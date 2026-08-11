import { NextResponse } from "next/server";
import { destroyMemberSessionCookie } from "@/lib/member-session";

export async function GET(request: Request) {
  await destroyMemberSessionCookie();
  return NextResponse.redirect(new URL("/member/login", request.url));
}

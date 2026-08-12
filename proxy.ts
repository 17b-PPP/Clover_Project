import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/session-core";
import {
  MEMBER_SESSION_COOKIE_NAME,
  decodeMemberSession,
} from "@/lib/member-session-core";

const ADMIN_ONLY_PATHS = ["/users", "/audit-log", "/api/users", "/api/audit-log"];

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/member" || pathname.startsWith("/member/")) {
    const memberSession = decodeMemberSession(
      request.cookies.get(MEMBER_SESSION_COOKIE_NAME)?.value
    );

    if (pathname === "/member/login") {
      if (memberSession) {
        return NextResponse.redirect(
          new URL("/member/dashboard", request.url)
        );
      }
      return NextResponse.next();
    }

    if (!memberSession) {
      const loginUrl = new URL("/member/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyPath(pathname) && session.role !== "ADMIN") {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/member-auth).*)",
  ],
};

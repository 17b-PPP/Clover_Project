import { cookies } from "next/headers";
import {
  MEMBER_SESSION_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
  decodeMemberSession,
  encodeMemberSession,
  type MemberSessionPayload,
} from "@/lib/member-session-core";

export async function createMemberSessionCookie(
  payload: Omit<MemberSessionPayload, "exp" | "type">
) {
  const exp = Date.now() + MEMBER_SESSION_TTL_SECONDS * 1000;
  const token = encodeMemberSession({ ...payload, type: "member", exp });
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_SESSION_TTL_SECONDS,
  });
}

export async function getMemberSession(): Promise<MemberSessionPayload | null> {
  const cookieStore = await cookies();
  return decodeMemberSession(cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value);
}

export async function destroyMemberSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_SESSION_COOKIE_NAME);
}

import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  decodeSession,
  encodeSession,
  type SessionPayload,
} from "@/lib/session-core";

export async function createSessionCookie(
  payload: Omit<SessionPayload, "exp">
) {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = encodeSession({ ...payload, exp });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function destroySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

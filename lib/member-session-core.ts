import crypto from "crypto";

export const MEMBER_SESSION_COOKIE_NAME = "member_session";
export const MEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface MemberSessionPayload {
  type: "member";
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function encodeMemberSession(payload: MemberSessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(json);
  return `${json}.${signature}`;
}

export function decodeMemberSession(
  token: string | undefined
): MemberSessionPayload | null {
  if (!token) return null;
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expectedSignature = sign(json);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8")
    ) as MemberSessionPayload;
    if (payload.type !== "member") return null;
    if (typeof payload.memberId !== "string" || payload.memberId.length === 0) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

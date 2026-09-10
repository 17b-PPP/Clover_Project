# Member Login + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a member-facing login (ID card number + date of birth) and a read-only sale-history dashboard, per `docs/superpowers/specs/2026-08-11-member-login-dashboard-design.md` and `Req5.md`. This is a completely separate, parallel system from the existing staff login/app — zero changes to staff auth behavior.

**Architecture:** Next.js 16 App Router. A new, fully independent session system (`lib/member-session-core.ts` / `lib/member-session.ts`) mirrors the existing staff session system's HMAC-signed-cookie scheme but with its own cookie name, payload shape, and a type discriminant (see Global Constraints). A new sibling route group `app/(member)/` holds `/member/login` and `/member/dashboard`, alongside the existing `app/(app)/` (staff) and `app/login/` (staff login). `proxy.ts` is extended (not forked) to branch on path prefix. The dashboard reuses the existing `PurchaseHistoryTable`/`Pagination`/`Table` components built for the staff purchase-history report, with one small additive prop change.

**Tech Stack:** Next.js 16.2.11, React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4, Prisma 6.19.3, Node's built-in `crypto` (no JWT/bcrypt libraries — matches existing conventions).

## Global Constraints

- No test framework is configured in this repo. Verify each task with `npx tsc --noEmit` (strict mode) plus `npm run lint`, and a manual check in the browser via `npm run dev`.
- **Do not modify** `lib/session-core.ts`, `lib/session.ts`, `SessionPayload`, or any existing staff-facing route/component/page. The member session system is entirely new, parallel code.
- **No Prisma schema changes and no migration in this plan.** `ActivityLog.staffId` is a required (non-nullable) foreign key to `Staff` — the existing `logActivity()`/`prisma.activityLog.create()` pattern used by staff login cannot log a member-initiated event without a schema change. This plan deliberately does NOT add member login/logout to the activity log (a deviation from the design spec's passing mention of this — logging member auth events is out of scope for this pass; Req5 never asked for an audit trail, and adding one would require an unplanned migration). If audit logging for member actions is wanted later, that's a separate, explicit follow-up.
- **Security hardening beyond the spec's literal wording:** `MemberSessionPayload` includes a `type: "member"` discriminant field, validated on decode. Reason: both the staff and member session systems reuse the same `SESSION_SECRET` env var to sign their HMAC cookies (matching the existing single-secret convention — no new env var). Without a discriminant, a signed staff `session` cookie value, if ever presented under the `member_session` cookie name (e.g. copied via devtools), would pass HMAC verification and decode into a member-shaped object with `memberId: undefined` — not exploitable to impersonate a specific member, but sloppy cross-system confusion worth closing cheaply. `decodeMemberSession` must reject any payload where `type !== "member"` or `memberId` isn't a non-empty string.
- All user-facing copy is Thai, matching the existing tone. Reuse existing Tailwind classes/patterns from `app/login/page.tsx`, `components/layout/Sidebar.tsx`, and `components/purchases/PurchaseHistoryTable.tsx` rather than inventing new styles.
- Member login credential verification: username = `idCardNumber` (exact match, already `@unique`), password = date of birth, compared via `member.dateOfBirth.toISOString().slice(0, 10) === submittedDateString` (UTC-safe string comparison — do NOT use local-timezone `Date` accessors, the same class of bug already fixed once in this codebase for `recordDate` filtering). Also require `member.status === "Active"`.
- Do not reveal which part of the credential pair was wrong (matches the existing staff login's generic "username or password incorrect" message) — avoids ID-card-number enumeration.

---

## Task 1: Member session core + cookie helpers

**Files:**
- Create: `lib/member-session-core.ts`
- Create: `lib/member-session.ts`

**Interfaces:**
- Produces: `MemberSessionPayload` type (`{ type: "member"; memberId: string; memberCode: string; firstName: string; lastName: string; exp: number }`), `MEMBER_SESSION_COOKIE_NAME`, `encodeMemberSession()`, `decodeMemberSession()` (all from `member-session-core.ts`); `createMemberSessionCookie(payload: Omit<MemberSessionPayload, "exp" | "type">)`, `getMemberSession(): Promise<MemberSessionPayload | null>`, `destroyMemberSessionCookie()` (from `member-session.ts`). These exact names and signatures are consumed by Tasks 2, 3, and 6.

- [ ] **Step 1: Write `lib/member-session-core.ts`**

```ts
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
```

- [ ] **Step 2: Write `lib/member-session.ts`**

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/member-session-core.ts lib/member-session.ts
git commit -m "feat: add parallel member session system"
```

---

## Task 2: Member auth API routes (login + logout)

**Files:**
- Create: `app/api/member-auth/login/route.ts`
- Create: `app/api/member-auth/logout/route.ts`

**Interfaces:**
- Consumes: `createMemberSessionCookie`, `destroyMemberSessionCookie` from `lib/member-session.ts` (Task 1); `handleRouteError` from `lib/api-error.ts` (existing, unchanged).
- Produces: `POST /api/member-auth/login` accepting `{ idCardNumber, dateOfBirth }` (both strings; `dateOfBirth` as `YYYY-MM-DD`), `POST /api/member-auth/logout`.

- [ ] **Step 1: Write the login route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMemberSessionCookie } from "@/lib/member-session";
import { handleRouteError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const { idCardNumber, dateOfBirth } = (await request.json()) as {
      idCardNumber?: string;
      dateOfBirth?: string;
    };

    if (!idCardNumber || !dateOfBirth) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขบัตรประชาชนและวันเกิด" },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { idCardNumber },
    });

    const dobMatches =
      member !== null &&
      member.dateOfBirth.toISOString().slice(0, 10) === dateOfBirth;

    if (!member || !dobMatches) {
      return NextResponse.json(
        { error: "เลขบัตรประชาชนหรือวันเกิดไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (member.status !== "Active") {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    await createMemberSessionCookie({
      memberId: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
    });

    return NextResponse.json({
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 2: Write the logout route**

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/member-auth/login/route.ts" "app/api/member-auth/logout/route.ts"
git commit -m "feat: add member login and logout API routes"
```

---

## Task 3: Extend `proxy.ts` for the member area

**Files:**
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: `MEMBER_SESSION_COOKIE_NAME`, `decodeMemberSession` from `lib/member-session-core.ts` (Task 1).

- [ ] **Step 1: Replace the file contents**

`proxy.ts` currently reads (28 lines, shown in full):

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/session-core";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

Replace it entirely with:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/session-core";
import {
  MEMBER_SESSION_COOKIE_NAME,
  decodeMemberSession,
} from "@/lib/member-session-core";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/member")) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/member-auth).*)",
  ],
};
```

Concretely: (1) the matcher's negative-lookahead exclusion list gains `|api/member-auth` so `POST /api/member-auth/login` and `POST /api/member-auth/logout` are never gated (mirrors the existing `api/auth` exclusion for staff); (2) the function body gains an early `if (pathname.startsWith("/member")) { ... }` branch that handles member-area routing entirely separately from the existing staff-session logic below it, which is otherwise untouched. Note the member branch does NOT need an `/api` sub-check like the staff branch has — no member-scoped API route other than the already-excluded `api/member-auth/*` exists in this plan, so any hypothetical unauthenticated request under `/member/api/...` would fall through to the page-redirect behavior, which is acceptable since no such route exists.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: gate /member routes with the member session in proxy.ts"
```

---

## Task 4: Member login page

**Files:**
- Create: `app/(member)/member/login/page.tsx`

**Interfaces:**
- Consumes: `Button`/`Input` from `components/ui/*` (existing, unchanged). POSTs to `/api/member-auth/login` (Task 2).

- [ ] **Step 1: Write the page**

This mirrors `app/login/page.tsx`'s existing structure (Suspense-wrapped client form, same card layout/branding) with member-appropriate fields and copy:

```tsx
"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function MemberLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [idCardNumber, setIdCardNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/member-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCardNumber, dateOfBirth }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      const next = searchParams.get("next") ?? "/member/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-base font-bold text-white">
            FL
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            เข้าสู่ระบบสมาชิก
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Field Latex — ระบบสำหรับสมาชิก
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="เลขบัตรประชาชน"
            required
            autoFocus
            inputMode="numeric"
            pattern="[0-9]{13}"
            title="เลขบัตรประชาชน 13 หลัก"
            minLength={13}
            maxLength={13}
            autoComplete="username"
            value={idCardNumber}
            onChange={(e) =>
              setIdCardNumber(e.target.value.replace(/\D/g, ""))
            }
          />
          <Input
            label="วันเกิด"
            type="date"
            required
            autoComplete="off"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full justify-center"
          >
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense fallback={null}>
      <MemberLoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(member)/member/login/page.tsx"
git commit -m "feat: add member login page"
```

---

## Task 5: `getPurchaseHistoryForMember()` and a reusable seller-name column

**Files:**
- Modify: `lib/data/purchases.ts`
- Modify: `components/purchases/PurchaseHistoryTable.tsx`

**Interfaces:**
- Produces: `getPurchaseHistoryForMember(memberId: string): Promise<Purchase[]>`. `PurchaseHistoryTable` gains an optional `sellerNameKey?: "ownerName" | "deliveredByName"` prop, defaulting to `"ownerName"` — the existing staff report page (`app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`) calls `<PurchaseHistoryTable purchases={...} />` with no such prop today, so the default preserves its current behavior exactly; Task 6's dashboard passes `sellerNameKey="deliveredByName"`.

- [ ] **Step 1: Add `getPurchaseHistoryForMember` to `lib/data/purchases.ts`**

Add this function after the existing `getPurchaseHistory()` (do not modify `getPurchaseHistory()`, `getPurchases()`, or any other function in the file):

```ts
export async function getPurchaseHistoryForMember(
  memberId: string
): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    where: { memberId },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
  });
  return purchases.map(serialize);
}
```

- [ ] **Step 2: Add the `sellerNameKey` prop to `PurchaseHistoryTable`**

`components/purchases/PurchaseHistoryTable.tsx` currently reads (62 lines, shown in full):

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDateUtc } from "@/lib/format";
import type { Purchase } from "@/lib/types";

interface PurchaseHistoryTableProps {
  purchases: Purchase[];
}

export function PurchaseHistoryTable({ purchases }: PurchaseHistoryTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบประวัติการรับซื้อ
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">วันที่</TableHeaderCell>
          <TableHeaderCell align="center">ชื่อผู้ขาย</TableHeaderCell>
          <TableHeaderCell align="center">เลขบิล</TableHeaderCell>
          <TableHeaderCell align="center">น้ำหนักน้ำยาง (กก.)</TableHeaderCell>
          <TableHeaderCell align="center">เนื้อยางแห้ง (%)</TableHeaderCell>
          <TableHeaderCell align="center">น้ำหนักยางแห้ง (กก.)</TableHeaderCell>
          <TableHeaderCell align="center">จำนวนเงิน</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {purchases.map((purchase) => (
          <TableRow key={purchase.id}>
            <TableCell>
              <span className="whitespace-nowrap text-slate-500">
                {formatDateUtc(purchase.recordDate)}
              </span>
            </TableCell>
            <TableCell>
              <span className="font-medium text-slate-900">
                {purchase.ownerName}
              </span>
            </TableCell>
            <TableCell>{purchase.purchaseCode}</TableCell>
            <TableCell>{purchase.rawWeightKg.toFixed(2)}</TableCell>
            <TableCell>{purchase.dryPercentage.toFixed(2)}</TableCell>
            <TableCell>{purchase.dryWeightKg.toFixed(2)}</TableCell>
            <TableCell>{formatCurrency(purchase.totalAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

Make exactly two changes: (1) add the prop to the interface and destructure it with a default; (2) replace `purchase.ownerName` with `purchase[sellerNameKey]`. Nothing else in the file changes:

```tsx
interface PurchaseHistoryTableProps {
  purchases: Purchase[];
  sellerNameKey?: "ownerName" | "deliveredByName";
}

export function PurchaseHistoryTable({
  purchases,
  sellerNameKey = "ownerName",
}: PurchaseHistoryTableProps) {
```

and:

```tsx
            <TableCell>
              <span className="font-medium text-slate-900">
                {purchase[sellerNameKey]}
              </span>
            </TableCell>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification of the unaffected staff page**

Run: `npm run dev`, open `/performance/purchases` (existing staff report, untouched behavior expected).
Expected: the "ชื่อผู้ขาย" column still shows `ownerName` exactly as before — confirming the default parameter preserves existing behavior.

- [ ] **Step 5: Commit**

```bash
git add lib/data/purchases.ts components/purchases/PurchaseHistoryTable.tsx
git commit -m "feat: add member-scoped purchase history query and a reusable seller-name column"
```

---

## Task 6: Member dashboard (header, layout, page, client)

**Files:**
- Create: `components/layout/MemberHeader.tsx`
- Create: `app/(member)/member/dashboard/layout.tsx`
- Create: `app/(member)/member/dashboard/page.tsx`
- Create: `app/(member)/member/dashboard/MemberDashboardClient.tsx`

**Interfaces:**
- Consumes: `getMemberSession` from `lib/member-session.ts` (Task 1); `MemberSessionPayload` type from `lib/member-session-core.ts` (Task 1); `getPurchaseHistoryForMember` from `lib/data/purchases.ts` (Task 5); `PurchaseHistoryTable` with its new `sellerNameKey` prop from `components/purchases/PurchaseHistoryTable.tsx` (Task 5); `Pagination`/`PageHeader` from `components/ui/*` (existing, unchanged).
- Note on scope: this layout lives at `app/(member)/member/dashboard/layout.tsx` (not a layout shared across all of `/member/*`), so it applies to `/member/dashboard` and anything nested under it later, but not `/member/login` (which correctly has no member-header, since there's no session yet at that point). If a future member-facing page needs to live outside `/member/dashboard/*`, a broader layout would need introducing then — out of scope for this plan's single-page dashboard.

- [ ] **Step 1: Write `components/layout/MemberHeader.tsx`**

A lightweight header for the member area — no Sidebar, matching the design's explicit choice that members get simpler chrome than staff:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberSessionPayload } from "@/lib/member-session-core";

interface MemberHeaderProps {
  currentMember: MemberSessionPayload | null;
}

export function MemberHeader({ currentMember }: MemberHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/member-auth/logout", { method: "POST" });
      router.push("/member/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
          FL
        </div>
        <p className="text-sm font-semibold text-slate-900">
          {currentMember
            ? `${currentMember.firstName} ${currentMember.lastName}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Write `app/(member)/member/dashboard/layout.tsx`**

```tsx
import { getMemberSession } from "@/lib/member-session";
import { MemberHeader } from "@/components/layout/MemberHeader";

export default async function MemberDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getMemberSession();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <MemberHeader currentMember={session} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/(member)/member/dashboard/MemberDashboardClient.tsx`**

No search/date filter (per the design spec — a member's own history is small; only pagination is needed):

```tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface MemberDashboardClientProps {
  purchases: Purchase[];
}

export function MemberDashboardClient({
  purchases,
}: MemberDashboardClientProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pagedPurchases = purchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการขายน้ำยาง"
        description="ดูประวัติการขายน้ำยางพาราของคุณ"
      />

      <PurchaseHistoryTable
        purchases={pagedPurchases}
        sellerNameKey="deliveredByName"
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
```

- [ ] **Step 4: Write `app/(member)/member/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/member-session";
import { getPurchaseHistoryForMember } from "@/lib/data/purchases";
import { MemberDashboardClient } from "./MemberDashboardClient";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  if (!session) {
    redirect("/member/login");
  }

  const purchases = await getPurchaseHistoryForMember(session.memberId);
  return <MemberDashboardClient purchases={purchases} />;
}
```

(The `redirect` here is defense-in-depth alongside `proxy.ts`'s gate from Task 3 — it also satisfies TypeScript strict mode, since `session.memberId` below it needs `session` narrowed to non-null.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no new errors (the two pre-existing errors in `MemberFormDialog.tsx`/`EmployeeFormDialog.tsx` postal-code effects are unrelated and expected to remain).

- [ ] **Step 7: Manual verification**

Run: `npm run dev`. Using a member row that already exists in the database (or create one via the staff `/members` page first, noting its ID card number and date of birth), navigate to `/member/login`:
1. Submit with a wrong ID card number → generic error shown, not redirected.
2. Submit with the correct ID card number but wrong date of birth → same generic error.
3. If a suspended (`Inactive`) member is available, submit correct credentials for them → "บัญชีนี้ถูกระงับการใช้งาน..." error.
4. Submit correct credentials for an active member → redirected to `/member/dashboard`, header shows the member's name, table shows only that member's own purchases (create one via the staff `/purchases` page first if the member has none) with the seller column showing the actual seller's name (their own name for self-sold, an employee's name for employee-sold).
5. Click "ออกจากระบบ" → redirected to `/member/login`; navigating back to `/member/dashboard` directly redirects to `/member/login` again (session cleared).
6. Separately, confirm staff login (`/login`) and the staff app (`/members`, `/purchases`, etc.) still work completely normally, unaffected by any of the above.

- [ ] **Step 8: Commit**

```bash
git add components/layout/MemberHeader.tsx "app/(member)/member/dashboard/layout.tsx" "app/(member)/member/dashboard/page.tsx" "app/(member)/member/dashboard/MemberDashboardClient.tsx"
git commit -m "feat: add member dashboard with sale-history table"
```

---

## Task 7: Final full-project verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors (two pre-existing errors in `MemberFormDialog.tsx`/`EmployeeFormDialog.tsx`, unrelated to this work, are expected to remain).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, and `/member/login` and `/member/dashboard` appear in the route list.

- [ ] **Step 4: End-to-end manual walkthrough**

Run: `npm run dev` and repeat Task 6 Step 7's full scenario list end to end in one sitting, plus: confirm a staff member logged into `/login` cannot use their staff session to access `/member/dashboard` (should redirect to `/member/login`, since it's a completely different cookie), and vice versa (a member session should not grant access to any `/` staff page — confirm redirect to `/login`).

No commit for this task — it's a verification gate before considering the plan complete.

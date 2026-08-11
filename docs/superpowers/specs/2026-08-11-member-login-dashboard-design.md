# Member Login + Dashboard Design

## Goal

Add a member-facing portal, entirely separate from the existing staff login/app: members log in with their ID card number (username) and date of birth (password), then land on a dashboard showing their own rubber-latex sale history. Per Req5.md, only the sale-history view is in scope for this pass — the dashboard is expected to grow more sections later.

## Non-goals

- No member self-registration — accounts are members already created by staff via the existing `/members` page (`idCardNumber`/`dateOfBirth` already exist on every `Member` row).
- No password change/reset flow, no "forgot password" — date of birth is fixed, staff-managed data.
- No changes to `SessionPayload`, `getSession()`, or any staff-facing auth code path.
- No dashboard sections beyond purchase history (no wallet balance, no dividend info, no withdrawal history — those may come later, per Req5's explicit "for now" scoping).
- No rate limiting / lockout on failed member logins — matches the existing staff login's behavior (logs failures, does not lock the account), for consistency; can be revisited later if abuse becomes a real concern.

## Auth architecture

**A fully parallel session system, not an extension of the staff one.**

New file `lib/member-session-core.ts` (isomorphic, mirrors `lib/session-core.ts`'s existing HMAC-signed-payload scheme — `base64url(JSON.stringify(payload))` + `.` + HMAC-SHA256 signature via `crypto`, verified with `timingSafeEqual`; NOT JWT, matching the existing convention):

```ts
export interface MemberSessionPayload {
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  exp: number;
}

export const MEMBER_SESSION_COOKIE_NAME = "member_session";
export const MEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches staff sessions

export function encodeMemberSession(payload: MemberSessionPayload): string { ... }
export function decodeMemberSession(token: string): MemberSessionPayload | null { ... }
```

New file `lib/member-session.ts` (server-only, mirrors `lib/session.ts`): `createMemberSessionCookie(payload)`, `getMemberSession()`, `destroyMemberSessionCookie()` — using `next/headers` `cookies()`, same httpOnly/secure/sameSite=lax/path=/ attributes as the staff cookie, just under `member_session` instead of `session`.

**Why parallel, not shared:** `SessionPayload.role` is a closed `"STAFF" | "ADMIN"` union used throughout the staff UI (e.g. `Sidebar.tsx`'s `roleLabel[currentUser.role]`). Widening it to include a member case would touch every staff call site and risk staff-side regressions for a completely different audience. A separate type/cookie/module has zero blast radius on existing code.

**Credential verification** (no new `Member` column):
- Username = `idCardNumber` (already `@unique` on `Member`).
- Password = date of birth, submitted from a native `<input type="date">` as a `YYYY-MM-DD` string.
- Verification compares the submitted date against `member.dateOfBirth` using a **UTC-safe** comparison (`member.dateOfBirth.toISOString().slice(0, 10) === submittedDate`) — deliberately not comparing via local-timezone `Date` accessors, the same class of bug already fixed once in this codebase for `recordDate` filtering (`lib/format.ts`'s `formatDateUtc`, added for the purchase-history report). Since `dateOfBirth` is a calendar date with no meaningful time component, UTC-anchored string comparison is the correct and only correct approach here.
- Also requires `member.status === "Active"`, mirroring the staff login's active-status check.
- Failed/successful attempts get logged via the existing `logActivity()` mechanism, matching staff login's behavior (new `ActivityLog` action variants, e.g. `MEMBER_LOGIN`/`MEMBER_LOGIN_FAILED`, added to the existing enum).

**`proxy.ts` changes** — extend the existing single gate, don't fork it into a second file:
- `config.matcher` stays as-is (still runs on nearly everything), but the exclusion list gains `api/member-auth` alongside the existing `api/auth`, so the member login POST isn't blocked before it can run.
- Inside `proxy()`, branch on `pathname.startsWith("/member")`: for member paths, decode the `member_session` cookie instead of `session`; if `pathname === "/member/login"` and a valid member session exists, redirect to `/member/dashboard`; if no valid member session and the path isn't `/member/login`, redirect to `/member/login` (mirroring the existing `?next=` pattern used for staff redirects). All non-`/member` paths keep exactly their current staff-session behavior, untouched.

## Routes

New route group `app/(member)/`, sibling to the existing `app/(app)/` (staff) group — no Sidebar, matching how `app/login/page.tsx` already lives outside `(app)` for the same reason (auth pages don't get the staff nav chrome).

- `app/(member)/member/login/page.tsx` → `/member/login`. Centered-card layout matching the staff `/login` page's visual style (`min-h-screen items-center justify-center bg-slate-50`, same branding/typography). Form: ID card number (text input, numeric, 13 digits — mirrors the existing `pattern`/`maxLength` treatment used for `idCardNumber` in `MemberFormDialog.tsx`) + date of birth (`<input type="date">`). POSTs to `/api/member-auth/login`; on success, `router.push("/member/dashboard")` + `router.refresh()`, matching the existing staff login page's post-login flow.
- `app/(member)/member/layout.tsx` → wraps `/member/dashboard` (and any future `/member/*` pages) in a lightweight header: member's full name + a "ออกจากระบบ" (log out) button (POSTs to a new `/api/member-auth/logout`, mirroring the existing staff logout route's pattern), no Sidebar.
- `app/(member)/member/dashboard/page.tsx` → `/member/dashboard`. Server component: calls `getMemberSession()`, fetches this member's purchase history, renders the dashboard content.
- New API route `app/api/member-auth/login/route.ts` — mirrors `app/api/auth/login/route.ts`'s structure (lookup by `idCardNumber`, verify date-of-birth + status, create cookie, log activity).
- New API route `app/api/member-auth/logout/route.ts` — mirrors the existing staff logout route.

## Dashboard content

Read-only table, scoped to only the logged-in member's own purchases. Visually matches the staff purchase-history page (`/performance/purchases`) — same `Table`/`TableHeaderCell` (centered headers)/`Pagination` primitives, same container width (`mx-auto max-w-6xl px-8 py-10`).

| Header (Thai) | Source field | Formatting |
|---|---|---|
| วันที่ | `recordDate` | `formatDateUtc()` (existing, added for the staff report — reused as-is) |
| ชื่อผู้ขาย | `deliveredByName` | plain text — already resolves correctly to the member's own name for self-sold purchases, or the employee's name for employee-sold purchases (confirmed against `lookupSeller()`'s existing logic in `lib/data/purchases.ts`: for a `MEMBER`-type sale, `deliveredByName` = the member's own full name; for an `EMPLOYEE`-type sale, `deliveredByName` = that employee's full name). No extra branching or "ตนเอง" substitution needed — the existing field already carries the right value for this exact column, per the confirmed decision to show the actual seller's name literally in both cases. |
| เลขบิล | `purchaseCode` | plain text |
| น้ำหนักน้ำยาง (กก.) | `rawWeightKg` | `.toFixed(2)` |
| เนื้อยางแห้ง (%) | `dryPercentage` | `.toFixed(2)` |
| น้ำหนักยางแห้ง (กก.) | `dryWeightKg` | `.toFixed(2)` |
| จำนวนเงิน | `totalAmount` | `formatCurrency()` |

No search/date-filter needed at this scope (a member's own history is inherently much smaller than the staff-wide report) — just pagination (10/page, reusing the existing `Pagination` component) once history grows past one page. Empty-state message when a member has no purchases yet.

## Data flow

New function in `lib/data/purchases.ts`, alongside the existing `getPurchases()`/`getPurchaseHistory()`:

```ts
export async function getPurchaseHistoryForMember(memberId: string): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    where: { memberId },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
  });
  return purchases.map(serialize);
}
```

No `take` cap — this is scoped to one member's own history, not a store-wide report, so unbounded is fine (and the existing `@@index([memberId])` on `Purchase` keeps this cheap). Reuses the file's existing `serialize()` helper, matching `getPurchaseHistory()`'s pattern exactly.

`app/(member)/member/dashboard/page.tsx` calls `getMemberSession()` (redirect to `/member/login` if absent — defense in depth alongside the `proxy.ts` gate, matching how `app/(app)/layout.tsx` also calls `getSession()` even though `proxy.ts` already gates the route) then `getPurchaseHistoryForMember(session.memberId)`, passing the result into a client component that owns only pagination state (no search/filter state needed, per the design above).

## Error handling

- Invalid credentials (wrong ID card number, wrong date of birth, or inactive account) → generic Thai error message on the login form, matching the staff login's existing pattern of not distinguishing "wrong username" from "wrong password" in the response (avoids username enumeration).
- Expired/missing member session on `/member/dashboard` → `proxy.ts` redirects to `/member/login` before the page even renders (same defense-in-depth pattern as staff pages).

## Testing

No test framework is configured in this repo. Verify via `npx tsc --noEmit` (strict mode), `npm run lint`, `npm run build`, and a manual browser walkthrough: log in as a member with a wrong ID card number, wrong birthdate, a suspended member, and a valid active member; confirm the dashboard shows only that member's purchases with correct formatting; confirm logout clears the session and redirects to `/member/login`; confirm staff login/session continues to work completely unaffected.

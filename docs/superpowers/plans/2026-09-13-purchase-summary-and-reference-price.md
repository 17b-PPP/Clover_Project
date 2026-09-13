# Purchase Summary Trend Chart, Purchase History Removal, and Daily Reference Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the standalone purchase-history page, add a daily trend chart above the recent-purchases list on the purchase-summary page, and let an admin set/edit a daily reference price that auto-fills (but doesn't lock) the market-price field on the purchase-entry form.

**Architecture:** Three independent, additive changes on top of the existing Next.js App Router structure: (1) delete the purchase-history route and its now-dead helpers; (2) a new `ReferencePrice` Prisma model + `lib/data/reference-price.ts` data layer, a new admin-only `/reference-price` page following the existing `/users` server-component-plus-client-component pattern, and one small addition to `PurchasesPageClient.tsx`'s existing price-hydration effect; (3) a `recharts` combo chart (bar + line) computed client-side from data the purchase-summary page already loads, inserted between the existing stat-card grid and the recent-purchases table.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 6 + PostgreSQL (Supabase, live `.env`-configured instance, no migrations directory — this project uses `prisma db push`), TypeScript, Tailwind v4, `recharts` (new dependency, added in Task 6). No test runner is configured in this project (no `test` script, no test files) — verification for every task uses `npm run lint`, `npm run build`, and a manual dev-server check, matching how prior work in this codebase (see `docs/superpowers/plans/2026-08-08-website-performance-optimization.md`) was verified.

## Global Constraints

- Default to writing no comments; add one only where the WHY is genuinely non-obvious.
- Don't introduce abstractions beyond what each task needs (YAGNI) — e.g. don't extract a shared `todayIso()` helper; this codebase already inlines `new Date().toISOString().slice(0, 10)` in multiple places (`app/(app)/purchases/PurchasesPageClient.tsx:17`, `app/api/performance/purchase-summary/export/route.ts:19`) and this plan follows that convention.
- No audit logging, approval workflow, or role beyond the existing ADMIN/STAFF split for the reference-price feature — explicitly out of scope per the design spec (`docs/superpowers/specs/2026-09-13-purchase-summary-and-reference-price-design.md`).
- Preserve the existing "lock price" behavior on the purchase entry form exactly; the reference price only changes what pre-fills the field when unlocked.
- Run `npm run lint` and `npm run build` after every task; both must pass.
- Prisma datasource is a live Supabase Postgres instance reachable via `.env` — `prisma db push` / `prisma generate` are safe, additive, idempotent commands here.
- Work directly on `main` unless told otherwise.

---

### Task 1: Remove the purchase history page

**Files:**
- Delete: `app/(app)/performance/purchases/page.tsx`
- Delete: `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`
- Delete: `components/purchases/PurchaseHistoryTable.tsx`
- Modify: `lib/data/purchases.ts:126-132` (remove `getPurchaseHistory`)
- Modify: `components/layout/Sidebar.tsx:90-95` (remove the "ประวัติการรับซื้อน้ำยาง" nav item)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new. `lib/data/purchases.ts` keeps exporting `lookupSeller`, `SellerLookupError`, `getPurchases`, `getPurchaseHistoryForMember`, `createPurchase` unchanged.

**Context:** A repo-wide search confirms `PurchaseHistoryTable` and `getPurchaseHistory` are referenced only from the three files being deleted (`lib/data/purchases.ts`, `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`, `app/(app)/performance/purchases/page.tsx`, plus the component's own file) — safe to delete outright.

- [ ] **Step 1: Delete the page and its client component**

```bash
git rm "app/(app)/performance/purchases/page.tsx" "app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx"
```

- [ ] **Step 2: Delete the now-unused table component**

```bash
git rm "components/purchases/PurchaseHistoryTable.tsx"
```

- [ ] **Step 3: Remove `getPurchaseHistory` from `lib/data/purchases.ts`**

Delete lines 126-132 (the whole function, including its blank line before the next function):

```ts
export async function getPurchaseHistory(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return purchases.map(serialize);
}
```

- [ ] **Step 4: Remove the sidebar nav item**

In `components/layout/Sidebar.tsx`, inside the `"Reports"` group's `items` array, delete this entry (lines 91-95):

```tsx
      {
        label: "ประวัติการรับซื้อน้ำยาง",
        href: "/performance/purchases",
        icon: <Icon path="M3 3v18h18M8 17V10M13 17V6M18 17v-4" />,
      },
```

The `"Reports"` group's `items` array should now start directly with the "ผลประกอบการรับซื้อน้ำยาง" entry.

- [ ] **Step 5: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors (confirms no remaining reference to the deleted exports/files).

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in as any user, and confirm:
- The sidebar's "Reports" group no longer shows "ประวัติการรับซื้อน้ำยาง".
- Visiting `/performance/purchases` directly renders the app's Next.js 404 page (the route no longer exists).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove purchase history page and its dead helpers"
```

---

### Task 2: Add the `ReferencePrice` Prisma model and data-access layer

**Files:**
- Modify: `prisma/schema.prisma` (append new model)
- Create: `lib/data/reference-price.ts`
- Modify: `lib/types.ts` (append new `ReferencePriceEntry` type)

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (existing shared client).
- Produces (for later tasks): `ReferencePriceEntry { id: string; date: string; price: number; updatedAt: string }` (in `lib/types.ts`); `getReferencePriceHistory(): Promise<ReferencePriceEntry[]>`, `getReferencePriceForDate(dateIso: string): Promise<ReferencePriceEntry | null>`, `upsertReferencePrice(dateIso: string, price: number): Promise<ReferencePriceEntry>` (in `lib/data/reference-price.ts`). `dateIso` is always a `"YYYY-MM-DD"` string, matching the convention `PurchaseInput.recordDate` already uses.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append this block at the end of the file (after the `ActivityLog` model, i.e. after the current line 259):

```prisma

// ==========================================
// REFERENCE PRICE (ราคากลางประจำวัน กำหนดโดยผู้ดูแลระบบ)
// หนึ่งวันมีได้ราคาเดียว — บันทึกซ้ำวันเดิมคือการแก้ไขราคาของวันนั้น
// ==========================================

model ReferencePrice {
  id        String   @id @default(cuid())
  date      DateTime @unique
  price     Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Push the schema change and regenerate the client**

Run: `npx prisma db push`
Expected: Output confirms the database is now in sync (creates the `ReferencePrice` table on the live Supabase instance).

Run: `npx prisma generate`
Expected: `@prisma/client` regenerates with a `ReferencePrice` type and `prisma.referencePrice` model delegate, no errors.

- [ ] **Step 3: Add the `ReferencePriceEntry` type to `lib/types.ts`**

Append at the end of the file (after `AuditLogEntry`):

```ts
export interface ReferencePriceEntry {
  id: string;
  // Business day this price applies to, ISO (UTC midnight) — same convention
  // as Purchase.recordDate.
  date: string;
  price: number;
  updatedAt: string;
}
```

- [ ] **Step 4: Create `lib/data/reference-price.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { ReferencePrice as PrismaReferencePrice } from "@prisma/client";
import type { ReferencePriceEntry } from "@/lib/types";

function serialize(row: PrismaReferencePrice): ReferencePriceEntry {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getReferencePriceHistory(): Promise<ReferencePriceEntry[]> {
  const rows = await prisma.referencePrice.findMany({
    orderBy: { date: "desc" },
  });
  return rows.map(serialize);
}

export async function getReferencePriceForDate(
  dateIso: string
): Promise<ReferencePriceEntry | null> {
  const row = await prisma.referencePrice.findUnique({
    where: { date: new Date(dateIso) },
  });
  return row ? serialize(row) : null;
}

export async function upsertReferencePrice(
  dateIso: string,
  price: number
): Promise<ReferencePriceEntry> {
  const date = new Date(dateIso);
  const row = await prisma.referencePrice.upsert({
    where: { date },
    create: { date, price },
    update: { price },
  });
  return serialize(row);
}
```

- [ ] **Step 5: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors.

- [ ] **Step 6: Manual verification against the live database**

Run (from the project root, Git Bash):
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const created = await p.referencePrice.upsert({
    where: { date: new Date('2026-01-01') },
    create: { date: new Date('2026-01-01'), price: 55.5 },
    update: { price: 55.5 },
  });
  console.log('upserted:', created);
  const found = await p.referencePrice.findUnique({ where: { date: new Date('2026-01-01') } });
  console.log('found:', found);
  await p.referencePrice.delete({ where: { date: new Date('2026-01-01') } });
  console.log('cleaned up test row');
  await p.\$disconnect();
})();
"
```
Expected: `upserted` and `found` both print a row with `price: 55.5` and `date` of `2026-01-01T00:00:00.000Z`; the cleanup delete succeeds with no error.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/data/reference-price.ts lib/types.ts
git commit -m "Add ReferencePrice model and data-access layer"
```

---

### Task 3: Add the admin-only reference-price API route and middleware gating

**Files:**
- Create: `app/api/reference-price/route.ts`
- Modify: `proxy.ts:9` (add `/reference-price` and `/api/reference-price` to `ADMIN_ONLY_PATHS`)

**Interfaces:**
- Consumes: `upsertReferencePrice` from `@/lib/data/reference-price.ts` (Task 2); `handleRouteError` from `@/lib/api-error.ts`.
- Produces: `POST /api/reference-price` — body `{ date: string; price: number }`, returns the upserted `ReferencePriceEntry` as JSON with status 200, or `{ error: string }` with status 400 on invalid input. Any non-ADMIN session is rejected by `proxy.ts` with a 403 JSON response before the route handler runs (same as `/api/users`).

- [ ] **Step 1: Add the new paths to `ADMIN_ONLY_PATHS` in `proxy.ts`**

Change line 9 from:

```ts
const ADMIN_ONLY_PATHS = ["/users", "/audit-log", "/api/users", "/api/audit-log"];
```

to:

```ts
const ADMIN_ONLY_PATHS = [
  "/users",
  "/audit-log",
  "/reference-price",
  "/api/users",
  "/api/audit-log",
  "/api/reference-price",
];
```

- [ ] **Step 2: Create `app/api/reference-price/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { upsertReferencePrice } from "@/lib/data/reference-price";
import { handleRouteError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { date?: string; price?: number };

    if (!body.date || body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "กรุณากรอกวันที่และราคาให้ครบถ้วน" },
        { status: 400 }
      );
    }
    if (body.price <= 0) {
      return NextResponse.json(
        { error: "ราคากลางต้องมากกว่า 0" },
        { status: 400 }
      );
    }

    const entry = await upsertReferencePrice(body.date, body.price);
    return NextResponse.json(entry, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

- [ ] **Step 3: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Log in as a STAFF user in the browser, then in the same browser visit `/api/reference-price` — actually since this route only implements `POST`, instead verify gating with `curl` using the STAFF session cookie copied from devtools (Application → Cookies):

```bash
curl -i -X POST http://localhost:3000/api/reference-price \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste the session cookie name=value here>" \
  -d '{"date":"2026-01-02","price":50}'
```
Expected (as STAFF): `HTTP/1.1 403` with body `{"error":"Forbidden"}`.

Log out, log in as an ADMIN user, copy that session cookie, and repeat the same `curl` command.
Expected (as ADMIN): `HTTP/1.1 200` with the created `ReferencePriceEntry` JSON body.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts "app/api/reference-price/route.ts"
git commit -m "Add admin-only reference-price API route"
```

---

### Task 4: Add the admin reference-price page and nav entry

**Files:**
- Create: `app/(app)/reference-price/page.tsx`
- Create: `app/(app)/reference-price/ReferencePricePageClient.tsx`
- Modify: `components/layout/Sidebar.tsx` (add nav item to the "Admin" group)

**Interfaces:**
- Consumes: `getReferencePriceHistory` from `@/lib/data/reference-price.ts` (Task 2); `ReferencePriceEntry` from `@/lib/types.ts` (Task 2); `POST /api/reference-price` (Task 3); `PageHeader`, `Input`, `Button` from `@/components/ui/*`; `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`/`TableHeaderCell` from `@/components/ui/Table`; `formatDateUtc`, `formatDateTimeThai`, `formatNumber` from `@/lib/format`.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Create the server component `app/(app)/reference-price/page.tsx`**

```tsx
import { getReferencePriceHistory } from "@/lib/data/reference-price";
import { ReferencePricePageClient } from "./ReferencePricePageClient";

export default async function ReferencePricePage() {
  const history = await getReferencePriceHistory();
  return <ReferencePricePageClient initialHistory={history} />;
}
```

- [ ] **Step 2: Create the client component `app/(app)/reference-price/ReferencePricePageClient.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeThai, formatDateUtc, formatNumber } from "@/lib/format";
import type { ReferencePriceEntry } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ReferencePricePageClientProps {
  initialHistory: ReferencePriceEntry[];
}

export function ReferencePricePageClient({
  initialHistory,
}: ReferencePricePageClientProps) {
  const [history, setHistory] = useState<ReferencePriceEntry[]>(initialHistory);
  const [date, setDate] = useState(todayIso());
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadRowIntoForm(entry: ReferencePriceEntry) {
    setDate(entry.date.slice(0, 10));
    setPrice(String(entry.price));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setError("กรุณากรอกราคากลางให้ถูกต้อง");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reference-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, price: numericPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกราคากลางได้");
      }
      const saved = data as ReferencePriceEntry;
      setHistory((prev) => {
        const withoutSameDay = prev.filter(
          (row) => row.date.slice(0, 10) !== saved.date.slice(0, 10)
        );
        return [saved, ...withoutSameDay].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <PageHeader
        title="ราคากลางประจำวัน"
        description="กำหนดราคากลางรับซื้อน้ำยางของแต่ละวัน ระบบจะเติมราคานี้ให้อัตโนมัติในหน้ารับซื้อ"
      />

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Input
          label="วันที่"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="ราคากลาง (บาท/กก.)"
          type="number"
          min={0}
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          ยังไม่มีการกำหนดราคากลาง
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell align="center">วันที่</TableHeaderCell>
              <TableHeaderCell align="center">ราคากลาง (บาท/กก.)</TableHeaderCell>
              <TableHeaderCell align="center">แก้ไขล่าสุดเมื่อ</TableHeaderCell>
              <TableHeaderCell align="center"></TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDateUtc(entry.date)}</TableCell>
                <TableCell>{formatNumber(entry.price)}</TableCell>
                <TableCell>{formatDateTimeThai(entry.updatedAt)}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => loadRowIntoForm(entry)}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    แก้ไข
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the nav item to the "Admin" group in `components/layout/Sidebar.tsx`**

In the `"Admin"` group's `items` array, add this entry (after "ตรวจสอบสิทธิ์ผู้ใช้งาน", before "ประวัติการใช้งาน" — or after both, order doesn't matter functionally):

```tsx
      {
        label: "ราคากลางประจำวัน",
        href: "/reference-price",
        icon: <Icon path="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
      },
```

- [ ] **Step 4: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in as ADMIN, and confirm:
- Sidebar's "Admin" group now shows "ราคากลางประจำวัน", linking to `/reference-price`.
- On `/reference-price`, submitting a price for today adds/updates a row in the history table below immediately (no page reload).
- Clicking "แก้ไข" on an existing row loads that row's date and price back into the form; submitting again updates the same row (no duplicate row appears).
- Log in as STAFF and confirm the "Admin" group (and its "ราคากลางประจำวัน" item) doesn't render, and visiting `/reference-price` directly redirects to `/`.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/reference-price" components/layout/Sidebar.tsx
git commit -m "Add admin reference-price page"
```

---

### Task 5: Auto-fill today's reference price on the purchase entry form

**Files:**
- Modify: `app/(app)/purchases/page.tsx`
- Modify: `app/(app)/purchases/PurchasesPageClient.tsx:22-94`

**Interfaces:**
- Consumes: `getReferencePriceForDate` from `@/lib/data/reference-price.ts` (Task 2).
- Produces: `PurchasesPageClientProps` gains `initialMarketPrice: string | null`. No other signatures change.

- [ ] **Step 1: Fetch today's reference price in `app/(app)/purchases/page.tsx`**

Replace the full file with:

```tsx
import { getEmployeeOptions } from "@/lib/data/employees";
import { getMemberOptions } from "@/lib/data/members";
import { getReferencePriceForDate } from "@/lib/data/reference-price";
import type { SellerOption } from "@/lib/types";
import { PurchasesPageClient } from "./PurchasesPageClient";

export default async function PurchasesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [members, employees, referencePrice] = await Promise.all([
    getMemberOptions(),
    getEmployeeOptions(),
    getReferencePriceForDate(today),
  ]);

  const sellerOptions: SellerOption[] = [
    ...members
      .filter((m) => m.status === "Active")
      .map((m) => ({
        code: m.memberCode,
        name: `${m.firstName} ${m.lastName}`,
        kind: "member" as const,
      })),
    ...employees
      .filter((e) => e.status === "Active")
      .map((e) => ({
        code: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        kind: "employee" as const,
      })),
  ];

  return (
    <PurchasesPageClient
      sellerOptions={sellerOptions}
      initialMarketPrice={referencePrice ? String(referencePrice.price) : null}
    />
  );
}
```

- [ ] **Step 2: Accept and apply `initialMarketPrice` in `PurchasesPageClient.tsx`**

In `app/(app)/purchases/PurchasesPageClient.tsx`, change the props interface and function signature (lines 22-28) from:

```tsx
interface PurchasesPageClientProps {
  sellerOptions: SellerOption[];
}

export function PurchasesPageClient({
  sellerOptions,
}: PurchasesPageClientProps) {
```

to:

```tsx
interface PurchasesPageClientProps {
  sellerOptions: SellerOption[];
  initialMarketPrice: string | null;
}

export function PurchasesPageClient({
  sellerOptions,
  initialMarketPrice,
}: PurchasesPageClientProps) {
```

Then update the price-hydration effect (lines 68-81) from:

```tsx
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(LOCKED_PRICE_STORAGE_KEY);
        if (raw) {
          setMarketPrice(raw);
          setPriceLocked(true);
        }
      } catch {
        // localStorage unavailable — ignore
      }
      setPriceHydrated(true);
    });
  }, []);
```

to:

```tsx
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(LOCKED_PRICE_STORAGE_KEY);
        if (raw) {
          setMarketPrice(raw);
          setPriceLocked(true);
        } else if (initialMarketPrice) {
          setMarketPrice(initialMarketPrice);
        }
      } catch {
        if (initialMarketPrice) setMarketPrice(initialMarketPrice);
      }
      setPriceHydrated(true);
    });
  }, [initialMarketPrice]);
```

The market-price `<input>` itself (lines 197-206) needs no change — it's already a plain editable field disabled only by `priceLocked || locked`, so a value pre-filled from `initialMarketPrice` remains editable exactly like a manually-typed one.

- [ ] **Step 3: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`.
- As ADMIN, go to `/reference-price` and set today's price to e.g. `55.50`.
- As any user, go to `/purchases` (in a fresh browser/incognito so no `localStorage` lock is present) and confirm the "ราคากลางประจำวัน" field is pre-filled with `55.5` and is still editable (typing over it works, submitting a purchase with the edited value succeeds).
- Clear the reference price test row from the DB (or pick a date with no saved price — e.g. temporarily test before setting one), reload `/purchases`, and confirm the field is empty and must be typed manually, exactly as before this change.
- Lock a price via the existing lock button, reload `/purchases`, and confirm the locked price (from `localStorage`) wins over the reference price — unchanged existing behavior.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/purchases/page.tsx" "app/(app)/purchases/PurchasesPageClient.tsx"
git commit -m "Auto-fill purchase entry market price from today's reference price"
```

---

### Task 6: Add the daily trend chart to the purchase-summary page

**Files:**
- Modify: `package.json` (add `recharts` dependency)
- Create: `components/performance/PurchaseTrendChart.tsx`
- Modify: `app/(app)/performance/purchase-summary/PurchaseSummaryPageClient.tsx:1-11, 32-39, 150-152`

**Interfaces:**
- Consumes: `filtered: PurchaseSummaryRow[]` (already computed in `PurchaseSummaryPageClient.tsx`); `formatDateUtc`, `formatNumber` from `@/lib/format`.
- Produces: `PurchaseTrendPoint { day: string; totalRawWeightKg: number; price: number }` and `PurchaseTrendChart({ data: PurchaseTrendPoint[] })` — exported from `components/performance/PurchaseTrendChart.tsx`, consumed only by `PurchaseSummaryPageClient.tsx`.

- [ ] **Step 1: Install `recharts`**

Run: `npm install recharts`
Expected: Installs successfully with no unresolvable peer-dependency errors against React 19 (recharts 3.x supports React 19). If npm reports a peer-dependency conflict, run `npm install recharts@latest` explicitly and re-check; do not use `--force`/`--legacy-peer-deps` without first confirming which recharts major version actually supports React 19.

- [ ] **Step 2: Create `components/performance/PurchaseTrendChart.tsx`**

```tsx
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateUtc, formatNumber } from "@/lib/format";

export interface PurchaseTrendPoint {
  day: string;
  totalRawWeightKg: number;
  price: number;
}

interface PurchaseTrendChartProps {
  data: PurchaseTrendPoint[];
}

function dayTickFormatter(day: string): string {
  return formatDateUtc(`${day}T00:00:00.000Z`);
}

export function PurchaseTrendChart({ data }: PurchaseTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่มีข้อมูลในช่วงเวลาที่เลือก
      </div>
    );
  }

  return (
    <div className="h-72 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tickFormatter={dayTickFormatter}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fontSize: 12, fill: "#64748b" }}
            label={{
              value: "กก.",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: "#64748b",
            }}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            tick={{ fontSize: 12, fill: "#64748b" }}
            label={{
              value: "บาท/กก.",
              angle: 90,
              position: "insideRight",
              fontSize: 12,
              fill: "#64748b",
            }}
          />
          <Tooltip
            labelFormatter={dayTickFormatter}
            formatter={(value: number) => formatNumber(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="weight"
            dataKey="totalRawWeightKg"
            name="น้ำหนักรวม (กก.)"
            fill="#059669"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="ราคาเฉลี่ย (บาท/กก.)"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Compute per-day trend data in `PurchaseSummaryPageClient.tsx`**

Add the import (alongside the existing imports at the top of the file):

```tsx
import {
  PurchaseTrendChart,
  type PurchaseTrendPoint,
} from "@/components/performance/PurchaseTrendChart";
```

Immediately after the existing `summary` `useMemo` block (after its closing `}, [filtered]);` — i.e. right after line 63), add:

```tsx
  const dailyTrend = useMemo<PurchaseTrendPoint[]>(() => {
    const byDay = new Map<string, PurchaseTrendPoint>();
    for (const row of filtered) {
      const day = row.recordDate.slice(0, 10);
      const existing = byDay.get(day);
      if (existing) {
        existing.totalRawWeightKg += row.rawWeightKg;
      } else {
        byDay.set(day, {
          day,
          totalRawWeightKg: row.rawWeightKg,
          price: row.marketPrice,
        });
      }
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);
```

- [ ] **Step 4: Render the chart above the recent-purchases section**

Insert a new `<section>` between the stat-card grid's closing `</section>` (line 150) and the recent-purchases `<section>` (line 152):

```tsx
      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          แนวโน้มรายวัน
        </h2>
        <PurchaseTrendChart data={dailyTrend} />
      </section>

```

- [ ] **Step 5: Build and lint**

Run: `npm run lint && npm run build`
Expected: Both succeed with no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in, go to `/performance/purchase-summary`, and confirm:
- A new "แนวโน้มรายวัน" section renders above "รายการรับซื้อล่าสุด", showing green bars (total daily weight) and an amber line (average daily price) with a legend.
- Changing the "จากวันที่"/"ถึงวันที่" filters updates both the stat cards and the chart consistently (same filtered date range).
- With a date range that has no purchases, the chart area shows "ไม่มีข้อมูลในช่วงเวลาที่เลือก" instead of an empty/broken chart.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json "components/performance/PurchaseTrendChart.tsx" "app/(app)/performance/purchase-summary/PurchaseSummaryPageClient.tsx"
git commit -m "Add daily trend chart to purchase-summary page"
```

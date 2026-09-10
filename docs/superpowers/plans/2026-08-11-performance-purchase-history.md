# ผลประกอบการ Purchase History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only purchase-history table under a new "Reports" sidebar group at `/performance/purchases`, per `docs/superpowers/specs/2026-08-11-performance-purchase-history-design.md` and `Req4.md`.

**Architecture:** Next.js 16 App Router. New route `app/(app)/performance/purchases/` follows the existing server-component-fetches/client-component-owns-state split used everywhere else in this app. The page's search/date-filter/pagination UI is copied structurally from `app/(app)/audit-log/AuditLogPageClient.tsx` (already built and reviewed), reusing the existing `Table`, `Pagination`, `Input`, and `PageHeader` primitives — no new UI primitives, no new dependencies.

**Tech Stack:** Next.js 16.2.11, React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4, Prisma 6.19.3.

## Global Constraints

- No test framework is configured in this repo. Verify each task with `npx tsc --noEmit` (strict mode) plus `npm run lint`, and a manual check in the browser via `npm run dev`.
- No third-party UI/date-picker libraries — reuse `components/ui/*` primitives and native `<input type="date">`.
- All user-facing copy is Thai, matching the existing tone (see the design spec's Thai column headers and labels — use them verbatim).
- Read-only feature: no create/edit/delete/print actions, no new API route. Data is read server-side via a `lib/data` function, exactly like `getAuditLogs()`/`getMembers()`/`getContracts()`.
- The render-time filter-reset pattern (comparing filter values against a tracked `prevFilters` state during render, NOT inside a `useEffect`) must be used for resetting `page` to 1 on filter change — a prior `useEffect`-based version of this exact pattern tripped the `react-hooks/set-state-in-effect` ESLint rule and had to be fixed; do not reintroduce it.
- Do not modify `getPurchases()`, `PurchasesPageClient.tsx`, or `POST /api/purchases` — this plan only adds new, additive code.

---

## Task 1: `getPurchaseHistory()` data function

**Files:**
- Modify: `lib/data/purchases.ts`

**Interfaces:**
- Produces: `getPurchaseHistory(): Promise<Purchase[]>` — the 200 most recent purchases ordered by `recordDate` descending, using the file's existing `serialize()` helper and the existing `Purchase` type from `lib/types.ts`.

- [ ] **Step 1: Add the function**

In `lib/data/purchases.ts`, add this function after the existing `getPurchases()` (which stays completely unchanged):

```ts
export async function getPurchaseHistory(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: { recordDate: "desc" },
    take: 200,
  });
  return purchases.map(serialize);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data/purchases.ts
git commit -m "feat: add getPurchaseHistory for the performance purchase-history page"
```

---

## Task 2: `PurchaseHistoryTable` component

**Files:**
- Create: `components/purchases/PurchaseHistoryTable.tsx`

**Interfaces:**
- Consumes: `Table`/`TableHead`/`TableHeaderCell`/`TableBody`/`TableRow`/`TableCell` from `components/ui/Table.tsx`; `formatDate`/`formatCurrency` from `lib/format.ts`; `Purchase` type from `lib/types.ts`.
- Produces: `PurchaseHistoryTable({ purchases }: { purchases: Purchase[] })` — a presentational table, no internal state.

- [ ] **Step 1: Write the component**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/format";
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
                {formatDate(purchase.recordDate)}
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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/purchases/PurchaseHistoryTable.tsx
git commit -m "feat: add PurchaseHistoryTable component"
```

---

## Task 3: Route — page, client component, filters, pagination

**Files:**
- Create: `app/(app)/performance/purchases/page.tsx`
- Create: `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`

**Interfaces:**
- Consumes: `getPurchaseHistory()` from Task 1; `PurchaseHistoryTable` from Task 2; `Pagination` from `components/ui/Pagination.tsx`; `Input`/`PageHeader` from `components/ui/*`.

- [ ] **Step 1: Write the server component**

```tsx
import { getPurchaseHistory } from "@/lib/data/purchases";
import { PurchaseHistoryPageClient } from "./PurchaseHistoryPageClient";

export default async function PurchaseHistoryPage() {
  const purchases = await getPurchaseHistory();
  return <PurchaseHistoryPageClient purchases={purchases} />;
}
```

Save as `app/(app)/performance/purchases/page.tsx`.

- [ ] **Step 2: Write the client component**

Save as `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`. This mirrors `app/(app)/audit-log/AuditLogPageClient.tsx`'s structure exactly (search + date-range filter + render-time page reset + client-side pagination over the capped server-fetched list), adapted to purchase fields:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import type { Purchase } from "@/lib/types";

const PAGE_SIZE = 10;

interface PurchaseHistoryPageClientProps {
  purchases: Purchase[];
}

export function PurchaseHistoryPageClient({
  purchases,
}: PurchaseHistoryPageClientProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [prevFilters, setPrevFilters] = useState({ search, dateFrom, dateTo });
  if (
    prevFilters.search !== search ||
    prevFilters.dateFrom !== dateFrom ||
    prevFilters.dateTo !== dateTo
  ) {
    setPrevFilters({ search, dateFrom, dateTo });
    setPage(1);
  }

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      const matchesSearch =
        !q ||
        [p.purchaseCode, p.ownerName, p.sellerCode]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const d = new Date(p.recordDate);
      const recordDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const matchesFrom = !dateFrom || recordDate >= dateFrom;
      const matchesTo = !dateTo || recordDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [purchases, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const pagedPurchases = filteredPurchases.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ประวัติการรับซื้อน้ำยาง"
        description="ดูประวัติรายการรับซื้อน้ำยางพาราทั้งหมด"
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1">
          <Input
            label="ค้นหาประวัติ"
            placeholder="ค้นหาด้วยเลขบิล ชื่อผู้ขาย หรือรหัส"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          label="จากวันที่"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          label="ถึงวันที่"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
      <p className="mb-4 text-xs text-slate-400">
        แสดงเฉพาะ 200 รายการล่าสุด
      </p>

      <PurchaseHistoryTable purchases={pagedPurchases} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors (this step matters specifically because the render-time page-reset pattern is easy to get wrong in a way ESLint flags — see Global Constraints).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, navigate directly to `/performance/purchases` (the sidebar link isn't wired until Task 4, so browse to the URL directly for now).
Expected: page renders with the filter row, the "แสดงเฉพาะ 200 รายการล่าสุด" note, and a table of purchases (or the empty-state box if none exist yet — create one via `/purchases` first if needed). Confirm search filters by bill number/seller name, the date range filters by `recordDate`, and pagination appears once there are more than 10 rows.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/performance/purchases/page.tsx" "app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx"
git commit -m "feat: add purchase history page with search, date filter, and pagination"
```

---

## Task 4: Sidebar navigation

**Files:**
- Modify: `components/layout/Sidebar.tsx`

**Interfaces:**
- None — this only adds an entry to the existing `navGroups` array (`NavGroup[]`, defined at the top of the file).

- [ ] **Step 1: Add the new group**

In `components/layout/Sidebar.tsx`, the `navGroups` array currently ends like this (lines 66–81):

```ts
  {
    label: "Admin",
    items: [
      {
        label: "ตรวจสอบสิทธิ์ผู้ใช้งาน",
        href: "/users",
        icon: <Icon path="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" />,
      },
      {
        label: "ประวัติการใช้งาน",
        href: "/audit-log",
        icon: <Icon path="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />,
      },
    ],
  },
];
```

Add a new group after the `"Admin"` group (before the closing `];`):

```ts
  {
    label: "Admin",
    items: [
      {
        label: "ตรวจสอบสิทธิ์ผู้ใช้งาน",
        href: "/users",
        icon: <Icon path="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" />,
      },
      {
        label: "ประวัติการใช้งาน",
        href: "/audit-log",
        icon: <Icon path="M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "ประวัติการรับซื้อน้ำยาง",
        href: "/performance/purchases",
        icon: <Icon path="M3 3v18h18M8 17V10M13 17V6M18 17v-4" />,
      },
    ],
  },
];
```

Concretely: only the array's closing bracket area changes — insert the new `{ label: "Reports", items: [...] }` group object between the `"Admin"` group's closing `},` and the array's closing `];`. Nothing else in the file changes (the rendering logic already maps over every group in `navGroups` generically, per the file's existing `{navGroups.map((group) => ...)}` — no template/rendering changes needed).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, check the sidebar.
Expected: a new "Reports" section appears below "Admin" with one item, "ประวัติการรับซื้อน้ำยาง", linking to `/performance/purchases`. Clicking it navigates there and highlights as active (matching the existing `pathname?.startsWith(item.href)` active-state logic already in the file).

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add Reports sidebar group linking to purchase history"
```

---

## Task 5: Final full-project verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors (two pre-existing errors in `MemberFormDialog.tsx`/`EmployeeFormDialog.tsx`, unrelated to this work, are expected to remain — do not attempt to fix them as part of this plan).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, and `/performance/purchases` appears in the route list.

- [ ] **Step 4: End-to-end manual walkthrough**

Run: `npm run dev` and walk through: (1) click "ประวัติการรับซื้อน้ำยาง" under the new "Reports" group in the sidebar; (2) confirm all 7 columns render with correctly formatted values against at least one real purchase (create one via `/purchases` first if the database has none); (3) confirm search, date-range filtering, and pagination (past 10 rows) all work together; (4) confirm the empty-state message appears when a search/filter combination matches nothing.

No commit for this task — it's a verification gate before considering the plan complete.

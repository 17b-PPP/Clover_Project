# ผลประกอบการ — Purchase History Design

## Goal

Add the first section of a new "business performance" (ผลประกอบการ) area of the app: a read-only table showing the history of rubber-latex purchases (การรับซื้อน้ำยาง). Per Req4.md, only this one view is in scope for now — the "ผลประกอบการ" area is expected to grow additional sections later (e.g. withdrawals summary, revenue), but nothing beyond purchase history should be built in this pass.

## Non-goals

- No row-level actions (view/edit/delete/reprint receipt) — display only.
- No changes to how purchases are created (`PurchasesPageClient.tsx`, `POST /api/purchases`) or to the existing `getPurchases()` function used by that flow.
- No new API route — the history page reads data server-side, like every other list page in this app.
- No sections beyond purchase history (no withdrawals/revenue summary yet).

## Navigation

Add a new sidebar group in `components/layout/Sidebar.tsx`, following the existing `navGroups` structure (group labels are literal English words — `"Staff"`, `"Admin"` — item labels are Thai):

```ts
{
  label: "Reports",
  items: [
    {
      label: "ประวัติการรับซื้อน้ำยาง",
      href: "/performance/purchases",
      icon: <Icon path="M3 3v18h18M8 17V10M13 17V6M18 17v-4" />, // bar-chart glyph, distinct from existing icons
    },
  ],
}
```

Appended as a third group after `"Admin"`.

## Data flow

**New function** in `lib/data/purchases.ts`:

```ts
export async function getPurchaseHistory(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: { recordDate: "desc" },
    take: 200,
  });
  return purchases.map(serialize);
}
```

Reuses the existing `serialize()` helper already defined in that file (converts Prisma `Decimal`/`Date` fields to `number`/ISO string, matching the `Purchase` type in `lib/types.ts`). Mirrors `getAuditLogs()`'s `take: 200` cap for the same reason: bound the amount of data loaded into the page on first render. The existing `getPurchases()` (no cap, used by `GET /api/purchases`) is untouched — this is a separate, additive function.

**New route files:**
- `app/(app)/performance/purchases/page.tsx` — async server component, calls `getPurchaseHistory()`, passes `purchases` as a prop into the client component. No client-side fetch, no loading spinner needed for the initial list (consistent with members/employees/contracts/audit-log, which all load their initial list this way).
- `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx` — `"use client"`, owns all filter/pagination state.

## Page UI

Container: `mx-auto max-w-6xl px-8 py-10` (matches members/employees/contracts/audit-log — all list/table-heavy pages use this width).

`PageHeader` with title "ประวัติการรับซื้อน้ำยาง" and a short description (e.g. "ดูประวัติรายการรับซื้อน้ำยางพาราทั้งหมด").

**Filters** (copied structure from `AuditLogPageClient.tsx`, which already implements this pattern and passed review):
- Search `Input` (matches against `purchaseCode`, `ownerName`, `sellerCode`)
- Two `Input type="date"` fields (จากวันที่ / ถึงวันที่), filtering on `recordDate`
- `PAGE_SIZE = 10`, with the same render-time "reset page to 1 when filters change" pattern used in `AuditLogPageClient.tsx` (comparing current filter values against a tracked `prevFilters` state during render — NOT a `useEffect`, since that pattern previously tripped the `react-hooks/set-state-in-effect` ESLint rule and was deliberately fixed to avoid it)
- A muted note below the filters: "แสดงเฉพาะ 200 รายการล่าสุด" (matches the audit-log page's cap notice, for the same reason)

**Table** — new `components/purchases/PurchaseHistoryTable.tsx`, built from the existing `Table`/`TableHead`/`TableHeaderCell`/`TableBody`/`TableRow`/`TableCell` primitives in `components/ui/Table.tsx`. Centered headers (`align="center"`, matching `AuditLogTable`'s convention). Empty-state guard: a dashed-border box with "ไม่พบประวัติการรับซื้อ" when the filtered list is empty (matches `AuditLogTable`'s empty state).

Columns, left to right:

| Header (Thai) | Source field | Formatting |
|---|---|---|
| วันที่ | `recordDate` | `formatDate()` from `lib/format.ts` (date only, no time) |
| ชื่อผู้ขาย | `ownerName` | plain text |
| เลขบิล | `purchaseCode` | plain text |
| น้ำหนักน้ำยาง (กก.) | `rawWeightKg` | `.toFixed(2)` |
| เนื้อยางแห้ง (%) | `dryPercentage` | `.toFixed(2)` |
| น้ำหนักยางแห้ง (กก.) | `dryWeightKg` | `.toFixed(2)` |
| จำนวนเงิน | `totalAmount` | `formatCurrency()` from `lib/format.ts` |

**Pagination**: existing `components/ui/Pagination.tsx`, wired identically to `AuditLogPageClient.tsx` (`page`/`totalPages`/`onPageChange`).

## Error handling

None beyond what's inherited from the existing patterns: the server component's `getPurchaseHistory()` call can throw like any other `lib/data` function (Next.js error boundary handles it), and the client component has no fetches of its own (all data arrives via props), so there's no client-side error state to manage.

## Testing

No test framework is configured in this repo (established in the prior Req3 work). Verify via `npx tsc --noEmit` (strict mode), `npm run lint`, `npm run build`, and a manual browser walkthrough of `/performance/purchases`: search filtering, date-range filtering, pagination past 10 rows, empty state, and that all 7 columns render correctly formatted.

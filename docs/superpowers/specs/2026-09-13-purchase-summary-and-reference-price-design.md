# Purchase Summary Trend Chart, Purchase History Removal, and Daily Reference Price — Design

Date: 2026-09-13
Source request: `Req7.md`

## Summary

Three related changes to the rubber-latex purchasing workflow:

1. Remove the standalone purchase-history page (`/performance/purchases`).
2. Add a daily trend chart to the purchase-summary page (`/performance/purchase-summary`), above the recent-purchases list.
3. Add an admin-only "daily reference price" feature: a new page to record/edit the day's reference price, persisted to the database, which auto-fills (but does not lock) the market price field on the purchase-entry form.

## 1. Remove purchase history page

Delete the following, plus anything that becomes dead code as a result:

- `app/(app)/performance/purchases/page.tsx`
- `app/(app)/performance/purchases/PurchaseHistoryPageClient.tsx`
- `components/purchases/PurchaseHistoryTable.tsx` — delete only if unused elsewhere (verify with a repo-wide reference check before deleting)
- `getPurchaseHistory()` in `lib/data/purchases.ts` — delete only if unused elsewhere
- The "ประวัติการรับซื้อน้ำยาง" entry (`href: "/performance/purchases"`) in the "Reports" nav group of `components/layout/Sidebar.tsx`

No redirect is needed for the removed route; it simply stops existing.

## 2. Daily trend chart on purchase-summary page

- Add the `recharts` dependency (no charting library currently exists in `package.json`).
- New component: `components/performance/PurchaseTrendChart.tsx`. Renders a combo chart:
  - Bars: total raw rubber weight received per day (กก.)
  - Line (secondary/right Y-axis): average market price per day (บาท/กก.)
- Data source: derived client-side in `PurchaseSummaryPageClient.tsx` via `useMemo`, grouping the same `filtered` rows already used to compute `summary` by calendar day (`recordDate`). No new data fetching or API route — the page already loads all purchase rows.
- Placement: new `<section>` inserted between the existing `StatCard` grid section and the "รายการรับซื้อล่าสุด" section (i.e., directly above `RecentPurchasesTable`).
- Time range: matches whatever `dateFrom`/`dateTo` filter is currently applied on the page — no independent date control on the chart.

## 3. Daily reference price (admin)

### Data model

New Prisma model in `prisma/schema.prisma`:

```prisma
model ReferencePrice {
  id        String   @id @default(cuid())
  date      DateTime @unique   // normalized to local midnight
  price     Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

One row per calendar day. Writes are an upsert keyed on the normalized `date`: submitting a price for a date that already has one overwrites it (no locking, no audit trail beyond `updatedAt`).

### Admin page

New route: `/reference-price` (admin-only).

- Add `/reference-price` and its API route(s) to `ADMIN_ONLY_PATHS` in `proxy.ts`.
- Add a new item ("ราคากลางประจำวัน") to the existing "Admin" nav group (`roles: ["ADMIN"]`) in `components/layout/Sidebar.tsx`.
- Follow the existing `/users` pattern: `app/(app)/reference-price/page.tsx` (server component, fetches history via a new `lib/data/reference-price.ts`) + `ReferencePricePageClient.tsx` (client component).
- UI:
  - Form: date picker (defaults to today) + price input + save button. Selecting a date that already has a saved price pre-fills the form for editing.
  - History table below the form: date, price, last-updated timestamp, sorted newest first. Clicking a row loads that date into the form for editing.

### Integration with purchase entry

In `app/(app)/purchases/`:

- `page.tsx` (server component) fetches today's `ReferencePrice` (if any) and passes it to `PurchasesPageClient` as a new prop, e.g. `initialMarketPrice?: string`.
- In `PurchasesPageClient.tsx`, the existing price-hydration effect (`priceHydrated`/`priceLocked`/`LOCKED_PRICE_STORAGE_KEY`) gains one more precedence level:
  1. If a locked price exists in `localStorage` — use it (existing behavior, unchanged).
  2. Else if `initialMarketPrice` was provided (today has a saved reference price) — pre-fill the field with it.
  3. Else — leave the field empty, as today.
- In every case the `marketPrice` input remains a plain editable field; staff can override the pre-filled value same as they could before.

## Out of scope

- No changes to the "lock price" feature's existing behavior or storage key.
- No approval workflow, audit log, or role beyond existing ADMIN/STAFF split for reference prices.
- No retroactive recompute of existing `Purchase.marketPrice` values when a reference price is added/edited later.

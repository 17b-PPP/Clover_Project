# Req3 UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four UX requests in `Req3.md`: confirm popups before submitting purchases/withdrawals, loading feedback on the members/employees/contracts pages, a friendlier audit-log table (centered headers, truncated details with a "view full" button, 10-per-page pagination, date-range filter), and contract-pairing guards (block suspended parties and duplicate active pairs) enforced server-side.

**Architecture:** Next.js 16 App Router project (`app/(app)/...` route group), Prisma 6 for data access (`lib/data/*.ts`), hand-rolled UI primitives in `components/ui/` (no component/date-picker library). Each feature page follows `page.tsx` (server component, fetches data) → `<Feature>PageClient.tsx` (`"use client"`, owns state) → `components/<feature>/*`. All new UI is built from existing primitives (`Modal`, `Button`, `Table`) to match the established pattern — no new dependencies.

**Tech Stack:** Next.js 16.2.11, React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4, Prisma 6.19.3.

## Global Constraints

- No test framework is configured in this repo (`package.json` has no test script, no Jest/Vitest/Playwright). Do not add one — out of scope for this UI-tweak spec. Verify each task with `npx tsc --noEmit` (strict mode is on) plus `npm run lint`, and a manual check in the browser via `npm run dev`. Steps below spell out the exact manual check instead of an automated test.
- No third-party UI/date-picker/form libraries — keep using the existing hand-rolled `components/ui/*` primitives and native HTML inputs (e.g. `<input type="date">`), consistent with the rest of the codebase.
- All user-facing copy is Thai, matching the existing tone in each file (ยืนยัน / ยกเลิก / กำลังบันทึก... etc).
- Follow the existing `Modal` footer pattern (`ยกเลิก` secondary button + primary action button, `disabled` while submitting) used by `SuspendConfirmDialog`/`DeleteConfirmDialog` components.
- Reuse `TableHeaderCell`/`TableCell` etc. from `components/ui/Table.tsx` — extend with props rather than forking the table.

---

## Task 1: Shared `ConfirmDialog` component

**Files:**
- Create: `components/ui/ConfirmDialog.tsx`

**Interfaces:**
- Produces: `ConfirmDialog({ open, title, message, confirmLabel?, cancelLabel?, onClose, onConfirm }: ConfirmDialogProps)` where `onConfirm: () => Promise<void>`. Manages its own `submitting` boolean internally (mirrors `SuspendConfirmDialog`). Renders `null` when `!open` is handled by the underlying `Modal` (it already returns `null` when `open` is false), so this component does not need its own early return.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `ConfirmDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/ConfirmDialog.tsx
git commit -m "feat: add shared ConfirmDialog component"
```

---

## Task 2: Confirm popup on the rubber-purchase page

**Files:**
- Modify: `app/(app)/purchases/PurchasesPageClient.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from Task 1 (`{ open, title, message, onClose, onConfirm }`).

- [ ] **Step 1: Split validation from submission and add confirm-dialog state**

In `app/(app)/purchases/PurchasesPageClient.tsx`, add the import and a new state near the other `useState` calls (after `formError`):

```tsx
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
```

```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
```

Replace the existing `handleCalculate` function (lines 86–133) with two functions — `openConfirm` (validates, then opens the dialog) and `submitPurchase` (the actual POST, unchanged body, now called from `ConfirmDialog`'s `onConfirm`):

```tsx
function openConfirm() {
  setFormError(null);

  if (!seller.data) {
    setFormError("กรุณากรอกรหัสสมาชิกหรือรหัสลูกจ้างที่ถูกต้อง");
    return;
  }
  const price = Number(marketPrice);
  const raw = Number(rawWeightKg);
  const pct = Number(dryPercentage);
  if (!price || price <= 0) {
    setFormError("กรุณากรอกราคากลางประจำวัน");
    return;
  }
  if (!raw || raw <= 0) {
    setFormError("กรุณากรอกน้ำหนักน้ำยางสดสุทธิ");
    return;
  }
  if (!pct || pct <= 0 || pct > 100) {
    setFormError("กรุณากรอกเนื้อยางแห้งให้ถูกต้อง (0-100%)");
    return;
  }

  setConfirmOpen(true);
}

async function submitPurchase() {
  setSubmitting(true);
  try {
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordDate,
        marketPrice: Number(marketPrice),
        sellerCode,
        rawWeightKg: Number(rawWeightKg),
        dryPercentage: Number(dryPercentage),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถบันทึกรายการรับซื้อได้");
    }
    setSaved(data as Purchase);
    setPriceLocked(true);
  } catch (error) {
    setFormError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
  } finally {
    setSubmitting(false);
  }
}
```

Change the "ยืนยัน" button's `onClick` (line 301) from `handleCalculate` to `openConfirm`.

Add the dialog just before the closing `</div>` of the component (after the `{saved && <PurchaseReceipt .../>}` line):

```tsx
<ConfirmDialog
  open={confirmOpen}
  title="ยืนยันการทำรายการ"
  message="ต้องการบันทึกรายการรับซื้อน้ำยางนี้ใช่หรือไม่?"
  onClose={() => setConfirmOpen(false)}
  onConfirm={submitPurchase}
/>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `PurchasesPageClient.tsx`.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/purchases`, fill in a valid seller code, market price, raw weight, and dry percentage, click "ยืนยัน".
Expected: a "ยืนยันการทำรายการ" popup appears with "ยกเลิก"/"ยืนยัน" buttons; clicking "ยกเลิก" closes it without submitting (form stays editable); clicking "ยืนยัน" submits, shows "กำลังบันทึก...", closes the popup, and renders the receipt as before.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/purchases/PurchasesPageClient.tsx"
git commit -m "feat: confirm popup before submitting a purchase"
```

---

## Task 3: Confirm popup on the withdrawal page

**Files:**
- Modify: `app/(app)/withdrawals/WithdrawalsPageClient.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` from Task 1.

- [ ] **Step 1: Split validation from submission and add confirm-dialog state**

Add the import and state:

```tsx
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
```

```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
```

Replace `handleConfirm` (lines 30–64) with:

```tsx
function openConfirm() {
  setFormError(null);

  if (!member.data) {
    setFormError("กรุณากรอกรหัสสมาชิกที่ถูกต้อง");
    return;
  }
  const value = Number(amount);
  if (!value || value <= 0) {
    setFormError("กรุณากรอกยอดเงินที่ต้องการเบิก");
    return;
  }
  if (value > member.data.walletBalance) {
    setFormError("ยอดเงินสะสมไม่เพียงพอสำหรับการเบิกครั้งนี้");
    return;
  }

  setConfirmOpen(true);
}

async function submitWithdrawal() {
  setSubmitting(true);
  try {
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberCode, amount: Number(amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถบันทึกรายการเบิกเงินได้");
    }
    setSaved(data as Withdrawal);
  } catch (error) {
    setFormError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
  } finally {
    setSubmitting(false);
  }
}
```

Change the "ยืนยัน" button's `onClick` (line 164) from `handleConfirm` to `openConfirm`.

Add the dialog before the closing `</div>` of the component (after `{saved && <WithdrawalReceipt .../>}`):

```tsx
<ConfirmDialog
  open={confirmOpen}
  title="ยืนยันการทำรายการ"
  message="ต้องการบันทึกรายการเบิกเงินนี้ใช่หรือไม่?"
  onClose={() => setConfirmOpen(false)}
  onConfirm={submitWithdrawal}
/>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `WithdrawalsPageClient.tsx`.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/withdrawals`, enter a valid member code and an amount within the wallet balance, click "ยืนยัน".
Expected: the same confirm popup pattern as purchases — cancel keeps the form editable, confirm submits and shows the receipt.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/withdrawals/WithdrawalsPageClient.tsx"
git commit -m "feat: confirm popup before submitting a withdrawal"
```

---

## Task 4: `Spinner` component and route-level loading UI for members/employees/contracts

**Files:**
- Create: `components/ui/Spinner.tsx`
- Create: `app/(app)/members/loading.tsx`
- Create: `app/(app)/employees/loading.tsx`
- Create: `app/(app)/contracts/loading.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `Spinner({ className? }: { className?: string })` — an inline SVG spinner using Tailwind's `animate-spin` utility plus a `size` via `className`.

- [ ] **Step 1: Write the Spinner component**

```tsx
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-emerald-700 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

(Tailwind v4 ships `animate-spin` out of the box, so no `globals.css` keyframes are needed for this — skip editing `globals.css` unless Step 4's manual check shows otherwise.)

- [ ] **Step 2: Write the three route-level loading files**

Each Next.js App Router route segment can define a `loading.tsx` that renders instantly while the paired `page.tsx` server component's data fetch (`getMembers()` / `getEmployees()` / `Promise.all([getContracts(), ...])`) is in flight — this fixes the "page loads slowly with no feedback" complaint for first navigation to these three pages.

`app/(app)/members/loading.tsx`:

```tsx
import { Spinner } from "@/components/ui/Spinner";

export default function MembersLoading() {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-center px-8 py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
```

`app/(app)/employees/loading.tsx` — identical, function name `EmployeesLoading`.

`app/(app)/contracts/loading.tsx` — identical, function name `ContractsLoading`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Using browser devtools, throttle network to "Slow 3G", then navigate to `/members`, `/employees`, and `/contracts` from the sidebar.
Expected: a centered spinner appears briefly before each page's content renders, instead of a blank/frozen screen.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Spinner.tsx "app/(app)/members/loading.tsx" "app/(app)/employees/loading.tsx" "app/(app)/contracts/loading.tsx"
git commit -m "feat: add loading spinner for members/employees/contracts navigation"
```

---

## Task 5: Loading feedback when opening a member's view/edit dialog

**Files:**
- Modify: `components/members/MemberFormDialog.tsx`
- Modify: `app/(app)/members/MembersPageClient.tsx`

**Interfaces:**
- Consumes: `Spinner` from Task 4.
- Produces: `MemberFormDialog` gains an optional `loading?: boolean` prop. When `true`, the dialog opens immediately showing a spinner instead of the form body.

- [ ] **Step 1: Add a `loading` prop to `MemberFormDialog`**

In `components/members/MemberFormDialog.tsx`, add the import:

```tsx
import { Spinner } from "@/components/ui/Spinner";
```

Add `loading?: boolean;` to `MemberFormDialogProps` (after `member?: Member | null;`), and destructure it in the function signature: `loading = false,` (after `member,`).

`MemberFormDialog.tsx` currently ends with (lines 126–297):

```tsx
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleByMode[mode]}
      widthClassName="max-w-2xl"
      footer={footer}
    >
      <form id="member-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ...existing form fields, unchanged... */}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
```

Change it to gate the `footer` prop and wrap the `<form>` in a `loading` conditional, leaving every field inside the `<form>...</form>` untouched:

```tsx
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleByMode[mode]}
      widthClassName="max-w-2xl"
      footer={loading ? undefined : footer}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form id="member-form" onSubmit={handleSubmit} className="space-y-5">
          {/* ...existing form fields, unchanged... */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
```

Concretely: only two edits are needed — (1) `footer={footer}` → `footer={loading ? undefined : footer}`, and (2) wrap the single existing `<form id="member-form" ...>...</form>` block in `{loading ? (<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>) : (` ... `)}`. Do not touch anything inside the `<form>`.

- [ ] **Step 2: Wire loading state into `MembersPageClient`**

In `app/(app)/members/MembersPageClient.tsx`, add a state near the other form state:

```tsx
const [formLoading, setFormLoading] = useState(false);
```

Replace `openViewForm` and `openEditForm` (lines 58–68) with:

```tsx
async function openViewForm(member: Member) {
  setSelectedMember(null);
  setFormMode("view");
  setFormLoading(true);
  setFormOpen(true);
  setSelectedMember(await fetchFullMember(member.id));
  setFormLoading(false);
}

async function openEditForm(member: Member) {
  setSelectedMember(null);
  setFormMode("edit");
  setFormLoading(true);
  setFormOpen(true);
  setSelectedMember(await fetchFullMember(member.id));
  setFormLoading(false);
}
```

Pass `loading={formLoading}` to `<MemberFormDialog ... />` (alongside the existing `member={selectedMember}` prop).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `MemberFormDialog.tsx` or `MembersPageClient.tsx`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, throttle network to "Slow 3G" in devtools, open `/members`, click "ดูข้อมูล" on any row.
Expected: the modal opens immediately showing a centered spinner, then swaps to the member's details once the fetch resolves. Same for "แก้ไข".

- [ ] **Step 5: Commit**

```bash
git add components/members/MemberFormDialog.tsx "app/(app)/members/MembersPageClient.tsx"
git commit -m "feat: show loading spinner while fetching a member's full record"
```

---

## Task 6: Loading feedback when opening an employee's view/edit dialog

**Files:**
- Modify: `components/employees/EmployeeFormDialog.tsx`
- Modify: `app/(app)/employees/EmployeesPageClient.tsx`

**Interfaces:**
- Same shape as Task 5, mirrored for employees (`EmployeeFormDialog` gains `loading?: boolean`; `EmployeesPageClient` gains `formLoading` state).

- [ ] **Step 1: Add a `loading` prop to `EmployeeFormDialog`**

Apply the identical change described in Task 5 Step 1, but to `components/employees/EmployeeFormDialog.tsx`: add `loading?: boolean;` to `EmployeeFormDialogProps`, destructure `loading = false,`, import `Spinner`, change `footer={footer}` → `footer={loading ? undefined : footer}` (line 135), and wrap the existing `<form id="employee-form" onSubmit={handleSubmit} className="space-y-5">...</form>` block (lines 137–285) in the same `loading ? (<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>) : ( ... )` conditional, without touching anything inside the `<form>`.

- [ ] **Step 2: Wire loading state into `EmployeesPageClient`**

In `app/(app)/employees/EmployeesPageClient.tsx`, add:

```tsx
const [formLoading, setFormLoading] = useState(false);
```

Replace `openViewForm` and `openEditForm` (lines 62–72) with:

```tsx
async function openViewForm(employee: Employee) {
  setSelectedEmployee(null);
  setFormMode("view");
  setFormLoading(true);
  setFormOpen(true);
  setSelectedEmployee(await fetchFullEmployee(employee.id));
  setFormLoading(false);
}

async function openEditForm(employee: Employee) {
  setSelectedEmployee(null);
  setFormMode("edit");
  setFormLoading(true);
  setFormOpen(true);
  setSelectedEmployee(await fetchFullEmployee(employee.id));
  setFormLoading(false);
}
```

Pass `loading={formLoading}` to `<EmployeeFormDialog ... />`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Same as Task 5 Step 4, but on `/employees`.

- [ ] **Step 5: Commit**

```bash
git add components/employees/EmployeeFormDialog.tsx "app/(app)/employees/EmployeesPageClient.tsx"
git commit -m "feat: show loading spinner while fetching an employee's full record"
```

---

## Task 7: Centered table headers for the audit-log table

**Files:**
- Modify: `components/ui/Table.tsx`
- Modify: `components/audit-log/AuditLogTable.tsx`

**Interfaces:**
- Produces: `TableHeaderCell` gains an optional `align?: "left" | "center" | "right"` prop, defaulting to `"left"` so every other table (members, employees, contracts) keeps its current layout unchanged.

- [ ] **Step 1: Add the `align` prop to `TableHeaderCell`**

In `components/ui/Table.tsx`, replace the `TableHeaderCell` function:

```tsx
const headerAlignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function TableHeaderCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: keyof typeof headerAlignClasses;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${headerAlignClasses[align]}`}
    >
      {children}
    </th>
  );
}
```

- [ ] **Step 2: Center the audit-log table's headers**

In `components/audit-log/AuditLogTable.tsx`, update the five `TableHeaderCell` usages (lines 35–39) to pass `align="center"`:

```tsx
<TableHeaderCell align="center">เวลา</TableHeaderCell>
<TableHeaderCell align="center">ชื่อผู้ใช้งาน</TableHeaderCell>
<TableHeaderCell align="center">บทบาท</TableHeaderCell>
<TableHeaderCell align="center">Action</TableHeaderCell>
<TableHeaderCell align="center">รายละเอียด</TableHeaderCell>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/audit-log` and `/members`.
Expected: audit-log column headers are centered; members table headers remain left-aligned (unaffected).

- [ ] **Step 5: Commit**

```bash
git add components/ui/Table.tsx components/audit-log/AuditLogTable.tsx
git commit -m "feat: center audit-log table headers"
```

---

## Task 8: Truncated "รายละเอียด" with a "view full text" button

**Files:**
- Create: `components/audit-log/DetailsCell.tsx`
- Modify: `components/audit-log/AuditLogTable.tsx`

**Interfaces:**
- Produces: `DetailsCell({ text }: { text: string })` — renders `text` truncated to 60 characters with a trailing "..." plus a "ดูข้อความเต็ม" button when `text.length > 60`; otherwise renders `text` as-is with no button. The button opens a `Modal` (from `components/ui/Modal.tsx`) showing the full text.
- Consumes: `Modal` from `components/ui/Modal.tsx`.

- [ ] **Step 1: Write `DetailsCell`**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const TRUNCATE_LENGTH = 60;

export function DetailsCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > TRUNCATE_LENGTH;

  if (!isLong) {
    return <span>{text}</span>;
  }

  return (
    <>
      <span>
        {text.slice(0, TRUNCATE_LENGTH)}...{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          ดูข้อความเต็ม
        </button>
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="รายละเอียด">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{text}</p>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Use `DetailsCell` in the audit-log table**

In `components/audit-log/AuditLogTable.tsx`, add the import:

```tsx
import { DetailsCell } from "@/components/audit-log/DetailsCell";
```

Replace line 61 `<TableCell>{entry.details}</TableCell>` with:

```tsx
<TableCell>
  <DetailsCell text={entry.details} />
</TableCell>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/audit-log`. Find (or trigger, e.g. by creating a contract) a row whose "รายละเอียด" text exceeds 60 characters.
Expected: the cell shows truncated text ending in "..." plus a "ดูข้อความเต็ม" button; clicking it opens a modal with the full text. Short details render unchanged with no button.

- [ ] **Step 5: Commit**

```bash
git add components/audit-log/DetailsCell.tsx components/audit-log/AuditLogTable.tsx
git commit -m "feat: truncate long audit-log details with a view-full-text dialog"
```

---

## Task 9: Pagination — show 10 latest, rest on page 2+

**Files:**
- Create: `components/ui/Pagination.tsx`
- Modify: `app/(app)/audit-log/AuditLogPageClient.tsx`

**Interfaces:**
- Produces: `Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void })`. Renders nothing when `totalPages <= 1`.

- [ ] **Step 1: Write `Pagination`**

```tsx
"use client";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ก่อนหน้า
      </Button>
      <span className="text-sm text-slate-600">
        หน้า {page} จาก {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ถัดไป
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Paginate the audit-log list client-side**

In `app/(app)/audit-log/AuditLogPageClient.tsx`, add imports:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
```

(Replace the existing `import { useMemo, useState } from "react";` with the line above — it now also needs `useEffect` for Step 3 of Task 10.)

Add a `PAGE_SIZE` constant and page state, and derive the current page's slice:

```tsx
const PAGE_SIZE = 10;

// ...inside the component, after `const [search, setSearch] = useState("");`
const [page, setPage] = useState(1);
```

After the existing `filteredEntries` memo, add:

```tsx
const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
const pagedEntries = filteredEntries.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE
);
```

Reset to page 1 whenever the filter changes (add this effect after the `filteredEntries` memo):

```tsx
useEffect(() => {
  setPage(1);
}, [search]);
```

Update the JSX: render `<AuditLogTable entries={pagedEntries} />` instead of `filteredEntries`, and add `<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />` immediately after it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/audit-log`. If fewer than 11 entries exist, no pagination controls should render and all entries show. To verify pagination with real data, either generate more than 10 activity-log rows (e.g. toggle a few member statuses, add/edit a member) or temporarily lower `PAGE_SIZE` to `2` for the check and revert it afterward.
Expected: only 10 rows show per page (most recent first, since `getAuditLogs()` already orders by `actionTime: "desc"`), with "ก่อนหน้า"/"ถัดไป" buttons and a "หน้า X จาก Y" label; the buttons disable at the first/last page respectively.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Pagination.tsx "app/(app)/audit-log/AuditLogPageClient.tsx"
git commit -m "feat: paginate audit log to 10 entries per page"
```

---

## Task 10: Date-range filter for the audit-log history

**Files:**
- Modify: `app/(app)/audit-log/AuditLogPageClient.tsx`

**Interfaces:**
- No new exports — purely internal state added to `AuditLogPageClient`.

- [ ] **Step 1: Add date-range inputs and filtering**

In `app/(app)/audit-log/AuditLogPageClient.tsx`, add state below `const [search, setSearch] = useState("");`:

```tsx
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
```

Update the `filteredEntries` memo to also filter by date range (comparing the entry's date portion, `entry.timestamp.slice(0, 10)`, against the `YYYY-MM-DD` values from the `<input type="date">` fields):

```tsx
const filteredEntries = useMemo(() => {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => {
    const matchesSearch =
      !q ||
      [e.username, e.action, e.details].join(" ").toLowerCase().includes(q);
    const entryDate = e.timestamp.slice(0, 10);
    const matchesFrom = !dateFrom || entryDate >= dateFrom;
    const matchesTo = !dateTo || entryDate <= dateTo;
    return matchesSearch && matchesFrom && matchesTo;
  });
}, [entries, search, dateFrom, dateTo]);
```

Extend the page-reset effect from Task 9 to also reset on date changes:

```tsx
useEffect(() => {
  setPage(1);
}, [search, dateFrom, dateTo]);
```

Add the two date inputs next to the existing search box in the JSX. Replace:

```tsx
<div className="mb-5 max-w-sm">
  <Input
    label="ค้นหาประวัติ"
    placeholder="ค้นหาด้วยชื่อผู้ใช้งาน หรือ Action"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>
```

with:

```tsx
<div className="mb-5 flex flex-wrap items-end gap-4">
  <div className="max-w-sm flex-1">
    <Input
      label="ค้นหาประวัติ"
      placeholder="ค้นหาด้วยชื่อผู้ใช้งาน หรือ Action"
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
```

(`components/ui/Input.tsx` already forwards native `<input>` props including `type`, so `type="date"` renders the browser's built-in calendar picker with no new dependency.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/audit-log`. Set "จากวันที่" and "ถึงวันที่" to a range that excludes today.
Expected: the table (and pagination count) updates to show only entries whose date falls within the chosen range; clicking the native date field opens the browser's calendar picker; clearing both fields shows all entries again.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/audit-log/AuditLogPageClient.tsx"
git commit -m "feat: filter audit log by date range"
```

---

## Task 11: Enforce suspended-party exclusion server-side when creating a contract

**Files:**
- Modify: `lib/data/contracts.ts`

**Interfaces:**
- Consumes: `prisma.member.findUnique`, `prisma.employee.findUnique` (existing Prisma client, already imported as `prisma`).
- Produces: `createContract()` now throws `Error("สมาชิกหรือลูกจ้างที่เลือกถูกระงับการใช้งาน")` if either party is not `"Active"`, before creating the pair. This is a safety net behind the already-working client-side filter in `ContractFormDialog.tsx` (which excludes suspended parties from the dropdown) — it also protects the `PATCH` renew path is unaffected (renew keeps the existing pair's parties, per `renewContract`).

- [ ] **Step 1: Add the status check to `createContract`**

In `lib/data/contracts.ts`, update `createContract` (lines 87–103):

```ts
export async function createContract(
  input: ContractInput
): Promise<Contract> {
  const [member, employee] = await Promise.all([
    prisma.member.findUnique({ where: { id: input.memberId } }),
    prisma.employee.findUnique({ where: { id: input.employeeId } }),
  ]);

  if (!member || member.status !== "Active") {
    throw new Error("สมาชิกที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }
  if (!employee || employee.status !== "Active") {
    throw new Error("ลูกจ้างที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }

  const pairCode = await nextPairCode();
  const pair = await prisma.mePair.create({
    data: {
      pairCode,
      memberId: input.memberId,
      employeeId: input.employeeId,
      memberShare: input.memberShare,
      employeeShare: input.employeeShare,
      status: "Active",
    },
    ...withParties,
  });
  return serialize(pair);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/contracts`, click "+ เพิ่มสัญญาจ้างใหม่". Confirm suspended members/employees still don't appear in the dropdowns (existing behavior). Then, using a REST client (e.g. `curl`) or devtools, POST directly to `/api/contracts` with the `id` of a suspended member (bypassing the UI) — e.g.:

```bash
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{"memberId":"<suspended-member-id>","employeeId":"<active-employee-id>","memberShare":50,"employeeShare":50}'
```

Expected: response status 500 with `{"error":"สมาชิกที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ"}` (matching the existing `handleRouteError` pattern used across the app), and no `MePair` row created.

- [ ] **Step 4: Commit**

```bash
git add lib/data/contracts.ts
git commit -m "fix: reject creating a contract with a suspended member or employee"
```

---

## Task 12: Block duplicate active contract pairs

**Files:**
- Modify: `lib/data/contracts.ts`

**Interfaces:**
- Consumes: `prisma.mePair.findFirst` (existing Prisma client).
- Produces: `createContract()` additionally throws `Error("สมาชิกและลูกจ้างคู่นี้มีสัญญาที่ยังใช้งานอยู่แล้ว")` if an active `MePair` already exists for the same `memberId` + `employeeId`. This check runs after the status check from Task 11, within the same function.

- [ ] **Step 1: Add the duplicate-active-pair check to `createContract`**

In `lib/data/contracts.ts`, extend `createContract` (as modified in Task 11) by inserting a check between the status validation and the `nextPairCode()` call:

```ts
export async function createContract(
  input: ContractInput
): Promise<Contract> {
  const [member, employee] = await Promise.all([
    prisma.member.findUnique({ where: { id: input.memberId } }),
    prisma.employee.findUnique({ where: { id: input.employeeId } }),
  ]);

  if (!member || member.status !== "Active") {
    throw new Error("สมาชิกที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }
  if (!employee || employee.status !== "Active") {
    throw new Error("ลูกจ้างที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }

  const existingActivePair = await prisma.mePair.findFirst({
    where: {
      memberId: input.memberId,
      employeeId: input.employeeId,
      status: "Active",
    },
  });
  if (existingActivePair) {
    throw new Error("สมาชิกและลูกจ้างคู่นี้มีสัญญาที่ยังใช้งานอยู่แล้ว");
  }

  const pairCode = await nextPairCode();
  const pair = await prisma.mePair.create({
    data: {
      pairCode,
      memberId: input.memberId,
      employeeId: input.employeeId,
      memberShare: input.memberShare,
      employeeShare: input.employeeShare,
      status: "Active",
    },
    ...withParties,
  });
  return serialize(pair);
}
```

Note: `renewContract` (lines 105–135) is unaffected — it ends the old pair (`contractEndDate: now`) and creates the new one in the same transaction, but does not set the new pair's `status` field explicitly in the `create` call shown, so it relies on the Prisma schema's `@default(Active)`. Since `renewContract` never calls `createContract`, this duplicate check does not block renewals — renewing the same pair is expected to keep working. No change needed there.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/contracts`. Create a new contract between an active member and an active employee (confirm it succeeds and appears in the table with status "Active"). Click "+ เพิ่มสัญญาจ้างใหม่" again and try to create a second contract for the exact same member+employee pair.
Expected: the second attempt fails with the error "สมาชิกและลูกจ้างคู่นี้มีสัญญาที่ยังใช้งานอยู่แล้ว" shown inline in the form (via `ContractFormDialog`'s existing `error` state — no dialog changes needed since `handleFormSubmit` already rethrows server errors that `ContractFormDialog.handleSubmit` catches and displays). Then use "ต่อสัญญาด้วยสัดส่วนใหม่" (renew) on the first contract's existing row and confirm it still succeeds (renew is unaffected).

- [ ] **Step 4: Commit**

```bash
git add lib/data/contracts.ts
git commit -m "fix: block creating a duplicate active contract for the same member/employee pair"
```

---

## Task 13: Final full-project verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors across the whole project.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable only if pre-existing on `main` — compare against `git stash` if unsure).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds (this also re-runs the TypeScript/ESLint checks Next.js performs during build, and validates the two new `loading.tsx` route segments compile correctly).

- [ ] **Step 4: End-to-end manual walkthrough**

Run: `npm run dev` and walk through, in order: (1) submit a purchase and a withdrawal, confirming the popup appears both times; (2) navigate to members/employees/contracts under network throttling and confirm the spinner shows; open a member's and an employee's view/edit dialog under throttling and confirm the in-modal spinner shows; (3) on `/audit-log`, confirm centered headers, a truncated details cell with working "ดูข้อความเต็ม", 10-per-page pagination, and date-range filtering all work together (e.g. search + date range + page 2); (4) on `/contracts`, confirm suspended members/employees are absent from the add-contract dropdowns and that creating a duplicate active pair is rejected with a clear Thai error message.

No commit for this task — it's a verification gate before considering the plan complete.

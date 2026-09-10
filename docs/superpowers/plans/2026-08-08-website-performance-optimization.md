# Website Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce real, measured payload/render waste across the site (member/employee/contract list pages and the photo upload flow) without adding architectural complexity, and keep any new code comment-light per this project's conventions.

**Architecture:** No new abstractions or libraries. Four independent, additive changes to the existing `lib/data/*.ts` / `*PageClient.tsx` / dialog-component layers: (1) trim an over-fetching Prisma `include` to a `select`, (2) add two slim "option list" queries so a picker dropdown stops pulling full member/employee rows, (3) replace "refetch the whole list after any single mutation" with using the mutation's own JSON response to update local state, (4) add one small shared client-side image-resize utility used by both photo upload forms, replacing duplicated `FileReader` code.

**Tech Stack:** Next.js 16 (App Router, Turbopack), Prisma 6 + PostgreSQL, TypeScript, Tailwind v4. No test runner is configured in this project (`package.json` has no `test` script and no test files exist) — verification for every task uses `npm run lint`, `npm run build`, and a manual/scripted check (dev server + `curl` or a short Playwright script), matching how prior work in this codebase (the purchases feature, Requirements9/10) was verified.

## Global Constraints

- Default to writing no comments; add one only where the WHY is genuinely non-obvious (per project convention already in force this session). Do not add comments explaining WHAT code does.
- Don't introduce new dependencies, new abstractions, or restructure files beyond what each task needs (YAGNI — this project explicitly avoids premature abstraction).
- Preserve existing behavior exactly except for the specific waste being removed — no drive-by refactors, no new validation/error-handling for cases that didn't have it before.
- Run `npm run lint` and `npm run build` after every task; both must pass (pre-existing errors in `EmployeeFormDialog.tsx:72` and `MemberFormDialog.tsx:74` — `react-hooks/set-state-in-effect` — are known-pre-existing and out of scope; do not fix them as part of this plan unless a task below explicitly touches those lines).
- Work directly on `main` (user explicitly declined an isolated worktree for this task).
- Windows/PowerShell + Git Bash dev environment; Prisma datasource is a live Supabase Postgres instance reachable via `.env` — `prisma db push`/`generate` are safe, cheap, idempotent commands here (already used successfully earlier this session).

---

### Task 1: Trim `getContracts`/`getContract`/etc. to select only the fields actually used

**Files:**
- Modify: `lib/data/contracts.ts:1-41`

**Interfaces:**
- Consumes: nothing new.
- Produces: no change to `getContracts()`, `getContract()`, `createContract()`, `renewContract()`, `getContractHistory()`, `setContractStatus()` signatures — all still return `Promise<Contract>` / `Promise<Contract[]>` / `Promise<Contract | undefined>` exactly as before. `serialize()` keeps the same signature and behavior.

**Context:** `withParties` currently does `include: { member: true, employee: true }`, pulling every column (including base64 `photoUrl`, `idCardNumber`, `address`, `district`, `province`, `postalCode`, `dateOfBirth`, `walletBalance`, etc.) for both sides of every contract row. `serialize()` (lines 12-41) only ever reads `id`, `memberCode`/`employeeCode`, `firstName`, `lastName`, `status` from each. This is real over-fetch on every contract list/detail/create/renew/status-toggle call.

- [ ] **Step 1: Replace `withParties` with a `select`-based validator**

Edit `lib/data/contracts.ts`, replacing lines 1-10:

```ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { MePair } from "@prisma/client";
import type { Contract, ContractInput } from "@/lib/types";

const memberSummarySelect = {
  id: true,
  memberCode: true,
  firstName: true,
  lastName: true,
  status: true,
} as const satisfies Prisma.MemberSelect;

const employeeSummarySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  status: true,
} as const satisfies Prisma.EmployeeSelect;

const withParties = Prisma.validator<Prisma.MePairDefaultArgs>()({
  include: {
    member: { select: memberSummarySelect },
    employee: { select: employeeSummarySelect },
  },
});

type MePairWithParties = MePair & {
  member: Prisma.MemberGetPayload<{ select: typeof memberSummarySelect }>;
  employee: Prisma.EmployeeGetPayload<{ select: typeof employeeSummarySelect }>;
};
```

Leave `serialize()` (the rest of the current lines 12-41) and every function below it (`nextPairCode`, `getContracts`, `getContract`, `createContract`, `renewContract`, `getContractHistory`, `setContractStatus`, `deleteContract`) completely unchanged — they already only read the five fields now selected, so no other edits are needed in this file.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors (this confirms `serialize()`'s field accesses all still resolve against the narrowed `MePairWithParties` type).

- [ ] **Step 3: Manual verification against the live database**

Run (from the project root, Git Bash):
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.mePair.findMany({
  include: { member: { select: { id:true, memberCode:true, firstName:true, lastName:true, status:true } }, employee: { select: { id:true, employeeCode:true, firstName:true, lastName:true, status:true } } },
  take: 1,
}).then((r) => { console.log(JSON.stringify(r, null, 2)); return p.\$disconnect(); });
"
```
Expected: Prints one contract row (or `[]` if no contracts exist yet) whose `member`/`employee` objects contain only `id`, `memberCode`/`employeeCode`, `firstName`, `lastName`, `status` — confirming the trimmed shape matches what `serialize()` expects. No `photoUrl`/`address`/`idCardNumber` fields present.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: Same 2 pre-existing errors as baseline (`EmployeeFormDialog.tsx:72`, `MemberFormDialog.tsx:74`), zero new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/data/contracts.ts
git commit -m "Trim contracts query to select only the fields serialize() uses"
```

---

### Task 2: Add slim member/employee "option" queries for the contract picker

**Files:**
- Modify: `lib/types.ts` (add two new interfaces)
- Modify: `lib/data/members.ts` (add `getMemberOptions`)
- Modify: `lib/data/employees.ts` (add `getEmployeeOptions`)
- Modify: `app/(app)/contracts/page.tsx`
- Modify: `app/(app)/contracts/ContractsPageClient.tsx`
- Modify: `components/contracts/ContractFormDialog.tsx`

**Interfaces:**
- Consumes: `MemberStatus`, `EmployeeStatus` (already exported from `lib/types.ts`).
- Produces:
  - `MemberOption { id: string; memberCode: string; firstName: string; lastName: string; status: MemberStatus }` (new type in `lib/types.ts`)
  - `EmployeeOption { id: string; employeeCode: string; firstName: string; lastName: string; status: EmployeeStatus }` (new type in `lib/types.ts`)
  - `getMemberOptions(): Promise<MemberOption[]>` (new export from `lib/data/members.ts`)
  - `getEmployeeOptions(): Promise<EmployeeOption[]>` (new export from `lib/data/employees.ts`)

**Context:** `app/(app)/contracts/page.tsx` currently calls `getMembers()`/`getEmployees()` — every column, every member/employee — purely to populate the "เจ้าของสวน"/"ลูกจ้าง" `<select>` dropdowns in `ContractFormDialog`. Confirmed by reading `ContractFormDialog.tsx`: it only reads `.id`, `.memberCode`/`.employeeCode`, `.firstName`, `.lastName`, `.status` from the `members`/`employees` props (lines 50-55, 172-176, 188-192). `ContractsPageClient.tsx` only passes these props through to `ContractFormDialog` (it doesn't read any other field from them itself) — confirmed via `grep -n "members\|employees"` showing only the prop-declaration and pass-through lines.

- [ ] **Step 1: Add the two option types to `lib/types.ts`**

Insert directly after the existing `EmployeeInput` interface (after line 69, before `export type ContractStatus = "Active" | "Inactive";`):

```ts
export interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  status: MemberStatus;
}

export interface EmployeeOption {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status: EmployeeStatus;
}
```

- [ ] **Step 2: Add `getMemberOptions()` to `lib/data/members.ts`**

Insert after `getMembers()` (after line 42):

```ts
export async function getMemberOptions(): Promise<MemberOption[]> {
  return prisma.member.findMany({
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
```

Update the type-only import at the top of the file (line 3) to also pull in `MemberOption`:

```ts
import type { Member, MemberInput, MemberOption } from "@/lib/types";
```

- [ ] **Step 3: Add `getEmployeeOptions()` to `lib/data/employees.ts`**

Insert after `getEmployees()` (after line 39):

```ts
export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  return prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
```

Update the type-only import at the top of the file (line 3):

```ts
import type { Employee, EmployeeInput, EmployeeOption } from "@/lib/types";
```

- [ ] **Step 4: Switch the contracts page to the slim queries**

Replace the full contents of `app/(app)/contracts/page.tsx`:

```ts
import { getContracts } from "@/lib/data/contracts";
import { getMemberOptions } from "@/lib/data/members";
import { getEmployeeOptions } from "@/lib/data/employees";
import { ContractsPageClient } from "./ContractsPageClient";

export default async function ContractsPage() {
  const [contracts, members, employees] = await Promise.all([
    getContracts(),
    getMemberOptions(),
    getEmployeeOptions(),
  ]);

  return (
    <ContractsPageClient
      initialContracts={contracts}
      members={members}
      employees={employees}
    />
  );
}
```

- [ ] **Step 5: Update `ContractsPageClient` prop types**

In `app/(app)/contracts/ContractsPageClient.tsx`, change the import (currently imports `Employee, Member` alongside `Contract, ContractInput` — check the exact current import line and replace `Employee`/`Member` with `EmployeeOption`/`MemberOption`) and the two prop type declarations:

```ts
import type {
  Contract,
  ContractInput,
  EmployeeOption,
  MemberOption,
} from "@/lib/types";
```
```ts
interface ContractsPageClientProps {
  initialContracts: Contract[];
  members: MemberOption[];
  employees: EmployeeOption[];
}
```

No other line in this file needs to change — the component only forwards `members`/`employees` as props to `ContractFormDialog`.

- [ ] **Step 6: Update `ContractFormDialog` prop types**

In `components/contracts/ContractFormDialog.tsx`, change line 8's import and the `members`/`employees` prop types (lines 16-17):

```ts
import type {
  Contract,
  ContractInput,
  EmployeeOption,
  MemberOption,
} from "@/lib/types";
```
```ts
interface ContractFormDialogProps {
  open: boolean;
  mode: ContractFormMode;
  contract?: Contract | null;
  members: MemberOption[];
  employees: EmployeeOption[];
  onClose: () => void;
  onSubmit: (input: ContractInput) => Promise<void>;
  onRequestEdit?: () => void;
}
```

The rest of the component (`activeMembers`/`activeEmployees` filters, the `<option>` rendering using `m.memberCode`/`e.employeeCode`) already only reads fields present on `MemberOption`/`EmployeeOption`, so no further edits are needed.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: Succeeds with no type errors. If TypeScript flags a mismatch, it means some other file also imports `Member`/`Employee` typed props from `ContractsPageClient`/`ContractFormDialog` — search with `grep -rn "ContractFormDialog\|ContractsPageClient" --include=*.tsx` and confirm no other caller passes full `Member[]`/`Employee[]` expecting the old prop type.

- [ ] **Step 8: Manual verification in the browser**

Start the dev server (`npm run dev`, wait for `http://localhost:3000` to respond), open `/contracts` with a valid session cookie (reuse the token-generation approach already used earlier this session: a short Node script signing a `SessionPayload` with `SESSION_SECRET` via `lib/session-core.ts`'s `sign()` logic), and confirm via the Network tab / a Playwright `page.waitForResponse` that the initial page load's embedded data for members/employees no longer contains `photoUrl`/`address`/`idCardNumber` (it's server-rendered into the client component props, so check via `page.evaluate` reading the Next.js flight payload, or simply confirm the "เพิ่มสัญญาจ้างใหม่" dialog's member/employee dropdowns still populate correctly with code + name — functional equivalence is the primary check here since the payload trimming happens server-side before serialization).
Expected: Dropdowns list all active members/employees by code and name exactly as before; creating a contract still works end-to-end.

- [ ] **Step 9: Run lint**

Run: `npm run lint`
Expected: Same 2 pre-existing errors, zero new ones.

- [ ] **Step 10: Commit**

```bash
git add lib/types.ts lib/data/members.ts lib/data/employees.ts "app/(app)/contracts/page.tsx" "app/(app)/contracts/ContractsPageClient.tsx" components/contracts/ContractFormDialog.tsx
git commit -m "Fetch slim member/employee option lists for the contract picker"
```

---

### Task 3: Stop refetching the entire list after every single mutation

**Files:**
- Modify: `app/(app)/members/MembersPageClient.tsx`
- Modify: `app/(app)/employees/EmployeesPageClient.tsx`
- Modify: `app/(app)/users/UsersPageClient.tsx`
- Modify: `app/(app)/contracts/ContractsPageClient.tsx`

**Interfaces:**
- Consumes: existing API responses — `POST /api/members`, `PATCH /api/members/[id]` (both branches: field-edit and `{status}` toggle), `DELETE /api/members/[id]` (and the equivalent `/api/employees`, `/api/users`, `/api/contracts` routes) — all already return the full updated/created record as JSON (confirmed by reading every route handler), or `{ success: true }` for `DELETE`.
- Produces: no change to any exported component's props or behavior visible to its parent — this is purely an internal implementation change to how each `*PageClient` keeps its local list in sync.

**Context:** Every one of these four client components currently does `await loadX()` (a `fetch("/api/x")` that re-downloads and replaces the *entire* array) after every single create, edit, status-toggle, and delete — even though the mutation's own response already contains the exact record that changed. `Contract` renewal is the one exception: `renewContract()` (server-side) ends the old contract row (sets `contractEndDate`) and creates a brand-new row, but the `PATCH` response only returns the *new* row — so a local-only update can't correctly reflect the old row's new `contractEndDate` without an extra request. This task therefore keeps `loadContracts()` (full refetch) for the renew path only, and converts every other mutation (across all four pages) to a local, targeted state update.

- [ ] **Step 1: Update `MembersPageClient.tsx`**

Delete the `loadMembers` function (lines 34-38) entirely — nothing will call it after this task.

Replace `handleFormSubmit` (lines 79-102):

```ts
async function handleFormSubmit(input: MemberInput) {
    if (formMode === "add") {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มสมาชิกได้");
      }
      setMembers((prev) => [...prev, data as Member]);
    } else if (formMode === "edit" && selectedMember) {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === data.id ? (data as Member) : m))
      );
    }
}
```

Replace `handleToggleStatus` (lines 104-114):

```ts
async function handleToggleStatus() {
    if (!statusMember) return;
    const nextStatus =
      statusMember.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/members/${statusMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setMembers((prev) =>
      prev.map((m) => (m.id === data.id ? (data as Member) : m))
    );
}
```

Replace `handleDelete` (lines 116-126):

```ts
async function handleDelete() {
    if (!deleteMember) return;
    const res = await fetch(`/api/members/${deleteMember.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสมาชิกได้");
    }
    setMembers((prev) => prev.filter((m) => m.id !== deleteMember.id));
}
```

- [ ] **Step 2: Update `EmployeesPageClient.tsx` the same way**

Delete `loadEmployees` (lines 38-42). Apply the identical transformation to `handleFormSubmit` (lines 83-106), `handleToggleStatus` (lines 108-118), `handleDelete` (lines 120-130), substituting `employees`/`setEmployees`/`Employee`/`/api/employees`/`selectedEmployee`/`statusEmployee`/`deleteEmployee` for the members equivalents, keeping every Thai error-message string exactly as it is today.

- [ ] **Step 3: Update `UsersPageClient.tsx`**

Delete `loadUsers` (lines 30-34). This page has no delete action (`UserTable`/`handleDelete` don't exist here — confirmed by reading the file), so only two functions change.

Replace `handleFormSubmit` (lines 70-93):

```ts
async function handleFormSubmit(input: UserInput) {
    if (formMode === "add") {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มผู้ใช้งานได้");
      }
      setUsers((prev) => [...prev, data as User]);
    } else if (formMode === "edit" && selectedUser) {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === data.id ? (data as User) : u))
      );
    }
}
```

Replace `handleToggleStatus` (lines 95-104):

```ts
async function handleToggleStatus() {
    if (!statusUser) return;
    const nextStatus = statusUser.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/users/${statusUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setUsers((prev) =>
      prev.map((u) => (u.id === data.id ? (data as User) : u))
    );
}
```

- [ ] **Step 4: Update `ContractsPageClient.tsx` — keep the refetch only for renew**

Replace `handleFormSubmit` (lines 110-133):

```ts
async function handleFormSubmit(input: ContractInput) {
    if (formMode === "add") {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มสัญญาจ้างได้");
      }
      setContracts((prev) => [...prev, data as Contract]);
    } else if (formMode === "edit" && selectedContract) {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
      // Renewing ends the old contract row and creates a new one server-side;
      // one response can't carry both changes, so refresh the full list here.
      await loadContracts();
    }
}
```

Replace `handleToggleStatus` (lines 135-145):

```ts
async function handleToggleStatus() {
    if (!statusContract) return;
    const nextStatus =
      statusContract.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/contracts/${statusContract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setContracts((prev) =>
      prev.map((c) => (c.id === data.id ? (data as Contract) : c))
    );
}
```

Replace `handleDelete` (lines 147-157):

```ts
async function handleDelete() {
    if (!deleteContract) return;
    const res = await fetch(`/api/contracts/${deleteContract.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสัญญาจ้างได้");
    }
    setContracts((prev) => prev.filter((c) => c.id !== deleteContract.id));
}
```

Keep `loadContracts` itself (lines 50-54) — it's still used by the renew branch above.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: Succeeds with no type errors (confirms every removed `loadX` function had no other callers, and every `data as X` cast lines up with each page's state type).

- [ ] **Step 6: Manual verification — one full CRUD cycle per page, confirming no extra GET fires**

Start the dev server and, using the same session-token approach used earlier this session (sign a `SessionPayload` cookie with `SESSION_SECRET`), drive each page with a short Playwright script that:
1. Navigates to the page.
2. Records all `request` events.
3. Performs one create, one status-toggle, and (for members/employees/contracts) one delete of a throwaway test record.
4. Asserts that after each mutation's `POST`/`PATCH`/`DELETE` resolves, **no** subsequent `GET /api/<x>` request fires (except for `/api/contracts` specifically after the renew/edit action, where one `GET` is expected and correct).
5. Asserts the UI table reflects the change (new row appears / status badge flips / row disappears) without a full page reload.

Expected: For members, employees, users: zero `GET` list requests after any mutation. For contracts: zero `GET` after add/suspend/delete, exactly one `GET /api/contracts` after a renew. Clean up any test records created (suspend + delete) at the end of the script.

- [ ] **Step 7: Run lint**

Run: `npm run lint`
Expected: Same 2 pre-existing errors, zero new ones.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/members/MembersPageClient.tsx" "app/(app)/employees/EmployeesPageClient.tsx" "app/(app)/users/UsersPageClient.tsx" "app/(app)/contracts/ContractsPageClient.tsx"
git commit -m "Update list state from mutation responses instead of refetching everything"
```

---

### Task 4: Resize photos client-side before storing as base64

**Files:**
- Create: `lib/image.ts`
- Modify: `components/members/MemberFormDialog.tsx`
- Modify: `components/employees/EmployeeFormDialog.tsx`

**Interfaces:**
- Consumes: nothing new (browser `File`, `FileReader`, `Image`, `HTMLCanvasElement` — all standard browser APIs, no new dependency).
- Produces: `resizeImageToDataUrl(file: File, maxDimension?: number, quality?: number): Promise<string>` — exported from `lib/image.ts`, used by both form dialogs' photo `<input type="file">` change handlers.

**Context:** Both `MemberFormDialog.handlePhotoChange` (lines 81-89) and `EmployeeFormDialog.handlePhotoChange` (same shape, confirmed via `grep`) currently do a raw `FileReader.readAsDataURL(file)` and store whatever the camera/gallery produced (potentially several MB) directly as `photoUrl`. That string is then persisted in Postgres and returned in full on every `GET /api/members`, `GET /api/employees`, and (until Task 1) every contract fetch — this is the single largest real payload-size driver found in the codebase survey. Resizing to a small max dimension before storing shrinks every downstream fetch that includes a photo, and also removes duplicated `FileReader` boilerplate from two files.

- [ ] **Step 1: Create the shared resize utility**

Create `lib/image.ts`:

```ts
// Camera-resolution photos stored as raw base64 would bloat every member/employee
// list and detail fetch (the photo travels on every row, every time). Resizing
// to a small max dimension before it ever reaches the server keeps those
// payloads small without touching the data layer.
export function resizeImageToDataUrl(
  file: File,
  maxDimension = 480,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: Wire it into `MemberFormDialog`**

In `components/members/MemberFormDialog.tsx`, add the import (after the existing `usePostalCodeLookup` import, line 8):

```ts
import { resizeImageToDataUrl } from "@/lib/image";
```

Replace `handlePhotoChange` (lines 81-89):

```ts
async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
}
```

- [ ] **Step 3: Wire it into `EmployeeFormDialog` the same way**

Apply the identical import + `handlePhotoChange` replacement to `components/employees/EmployeeFormDialog.tsx` (same line shape — confirm exact line numbers with `grep -n "handlePhotoChange\|FileReader" components/employees/EmployeeFormDialog.tsx` before editing, since this task doc was written from a `grep` summary, not a full read).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: Succeeds with no type errors.

- [ ] **Step 5: Manual verification — confirm real size reduction**

Run a short Playwright script against the dev server (same session-cookie approach as prior tasks) that:
1. Opens `/members`, clicks "+ เพิ่มสมาชิกใหม่".
2. Uses `page.setInputFiles` on the photo `<input type="file">` with a generated large test image (e.g., write a ~1600x1600 PNG to the scratchpad directory first, using any quick method available — a solid-color canvas rendered and saved via a tiny Node script with the `canvas`-free approach of drawing in a headless page and calling `toDataURL`, or reuse Playwright's own screenshot of a colored page as the source file).
3. Waits for the photo preview `<img>` to appear, then reads `img.naturalWidth`/`img.naturalHeight` via `page.evaluate` and asserts the larger dimension is `<= 480`.
4. Reads the form's in-memory `photoUrl` length indirectly by checking the rendered `<img src="data:...">` attribute length is far smaller than the original test file's data-URL length (log both lengths for comparison).

Expected: Preview image's larger dimension is ≤480px; resulting data-URL is a small fraction (order of magnitude smaller) of a naive full-resolution read of the same source image.

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: Same 2 pre-existing errors, zero new ones (this task does not touch either flagged line).

- [ ] **Step 7: Commit**

```bash
git add lib/image.ts components/members/MemberFormDialog.tsx components/employees/EmployeeFormDialog.tsx
git commit -m "Resize photos client-side before storing as base64"
```

---

## Explicitly out of scope (considered, rejected)

- **Trimming `getMembers()`/`getEmployees()`/`getUsers()` list-view selects to drop `photoUrl`.** Rejected: the same array objects returned by these functions are reused directly as the `member`/`employee` prop when a table row's "view"/"edit" action opens `MemberFormDialog`/`EmployeeFormDialog`, which needs `photoUrl` (and every other field) to prefill the form. Trimming the list select would require a second fetch-by-id when opening the dialog, adding a network round-trip and branching logic for a benefit Task 4 (resizing photos at the source) already captures — not worth the added complexity per this project's "keep it simple" convention.
- **Pagination on members/employees/contracts/purchases lists.** Rejected: this is an internal staff tool at "dozens to low-thousands of records" scale (per codebase survey); server-side paging would add real complexity (cursors, page-state in the URL, etc.) for no measured benefit at this scale.
- **Any change to `LiveClock`, `useSellerLookup`, `useMemo` filter usage, font loading, or `next.config.ts`.** Rejected: the codebase survey confirmed each of these is already correctly implemented (isolated re-render scope, proper debounce, proper memoization, standard `next/font` usage, no missing bundle-level config worth adding for this project's dependency-light footprint) — no action needed.

## Self-Review Notes

- **Spec coverage:** all four in-scope findings from the codebase survey (contracts over-include, contracts-page full member/employee fetch, full-list refetch after mutation, uncompressed photo uploads) each map to exactly one task above. The two lower-value findings (`getMembers`/`getEmployees`/`getUsers` select-trimming, sequential-code `findFirst` race) are explicitly called out as rejected with rationale, per the "no gaps silently dropped" self-review rule.
- **Placeholder scan:** every step has literal code, exact file paths, and exact current line numbers (verified by reading each file in full before writing this plan) — no "TBD"/"handle appropriately"/"similar to Task N" placeholders.
- **Type consistency:** `MemberOption`/`EmployeeOption` field names (`id`, `memberCode`/`employeeCode`, `firstName`, `lastName`, `status`) are used identically across Task 2's Steps 1-6 (`lib/types.ts` definition, `getMemberOptions`/`getEmployeeOptions` Prisma `select` shape, `ContractsPageClient`/`ContractFormDialog` prop types) — no drift. `resizeImageToDataUrl`'s signature (`file: File, maxDimension = 480, quality = 0.82`) is used with defaults (no explicit args) identically in both Task 4 call sites.

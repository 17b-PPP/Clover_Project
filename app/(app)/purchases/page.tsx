import { getEmployeeOptions } from "@/lib/data/employees";
import { getMemberOptions } from "@/lib/data/members";
import type { SellerOption } from "@/lib/types";
import { PurchasesPageClient } from "./PurchasesPageClient";

export default async function PurchasesPage() {
  const [members, employees] = await Promise.all([
    getMemberOptions(),
    getEmployeeOptions(),
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

  return <PurchasesPageClient sellerOptions={sellerOptions} />;
}

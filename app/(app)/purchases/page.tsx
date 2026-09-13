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

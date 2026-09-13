import { getEmployeeOptions } from "@/lib/data/employees";
import { getMemberOptions } from "@/lib/data/members";
import { getReferencePriceForDate } from "@/lib/data/reference-price";
import type { SellerOption } from "@/lib/types";
import { PurchasesPageClient } from "./PurchasesPageClient";

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Reference prices are set by the admin thinking in Bangkok days, so the
// lookup key must be today's Bangkok date, not the UTC date.
function bangkokToday(): string {
  return bangkokDateFormatter.format(new Date());
}

export default async function PurchasesPage() {
  const today = bangkokToday();
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

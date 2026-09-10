import { prisma } from "@/lib/prisma";
import type { PurchaseSummaryRow } from "@/lib/types";

// The co-op records at most a few hundred purchases a year, so the performance
// page pulls the whole history once and lets the client recompute the summary
// cards and table against whatever date window the user picks — the same
// client-side filtering approach the purchase history page already uses.
export async function getPurchaseSummaryRows(): Promise<PurchaseSummaryRow[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      purchaseCode: true,
      recordDate: true,
      createdAt: true,
      rawWeightKg: true,
      dryPercentage: true,
      dryWeightKg: true,
      marketPrice: true,
      totalAmount: true,
      member: {
        select: { memberCode: true, firstName: true, lastName: true },
      },
    },
  });

  return purchases.map((purchase) => ({
    id: purchase.id,
    purchaseCode: purchase.purchaseCode,
    recordDate: purchase.recordDate.toISOString(),
    createdAt: purchase.createdAt.toISOString(),
    memberCode: purchase.member.memberCode,
    memberName: `${purchase.member.firstName} ${purchase.member.lastName}`,
    rawWeightKg: purchase.rawWeightKg.toNumber(),
    dryPercentage: purchase.dryPercentage.toNumber(),
    dryWeightKg: purchase.dryWeightKg.toNumber(),
    marketPrice: purchase.marketPrice.toNumber(),
    totalAmount: purchase.totalAmount.toNumber(),
  }));
}

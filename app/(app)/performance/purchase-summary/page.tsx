import { getPurchaseSummaryRows } from "@/lib/data/purchase-summary";
import { getWithdrawals } from "@/lib/data/withdrawals";
import { PurchaseSummaryPageClient } from "./PurchaseSummaryPageClient";

export default async function PurchaseSummaryPage() {
  const [rows, withdrawals] = await Promise.all([
    getPurchaseSummaryRows(),
    getWithdrawals(),
  ]);
  return <PurchaseSummaryPageClient rows={rows} withdrawals={withdrawals} />;
}

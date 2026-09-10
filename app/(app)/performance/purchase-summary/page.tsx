import { getPurchaseSummaryRows } from "@/lib/data/purchase-summary";
import { PurchaseSummaryPageClient } from "./PurchaseSummaryPageClient";

export default async function PurchaseSummaryPage() {
  const rows = await getPurchaseSummaryRows();
  return <PurchaseSummaryPageClient rows={rows} />;
}

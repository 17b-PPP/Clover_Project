import { getPurchaseHistory } from "@/lib/data/purchases";
import { PurchaseHistoryPageClient } from "./PurchaseHistoryPageClient";

export default async function PurchaseHistoryPage() {
  const purchases = await getPurchaseHistory();
  return <PurchaseHistoryPageClient purchases={purchases} />;
}

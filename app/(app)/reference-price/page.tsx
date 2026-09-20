import { getReferencePriceLog } from "@/lib/data/reference-price";
import { ReferencePricePageClient } from "./ReferencePricePageClient";

export default async function ReferencePricePage() {
  const log = await getReferencePriceLog();
  return <ReferencePricePageClient initialLog={log} />;
}

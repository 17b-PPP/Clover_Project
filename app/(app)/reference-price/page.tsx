import { getReferencePriceHistory } from "@/lib/data/reference-price";
import { ReferencePricePageClient } from "./ReferencePricePageClient";

export default async function ReferencePricePage() {
  const history = await getReferencePriceHistory();
  return <ReferencePricePageClient initialHistory={history} />;
}

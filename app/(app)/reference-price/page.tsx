import {
  getReferencePriceHistory,
  getReferencePriceLog,
} from "@/lib/data/reference-price";
import { ReferencePricePageClient } from "./ReferencePricePageClient";

export default async function ReferencePricePage() {
  const [history, log] = await Promise.all([
    getReferencePriceHistory(),
    getReferencePriceLog(),
  ]);
  return <ReferencePricePageClient initialHistory={history} initialLog={log} />;
}

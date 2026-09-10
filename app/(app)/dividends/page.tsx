import { getDividendData } from "@/lib/data/dividends";
import { DividendsPageClient } from "./DividendsPageClient";

export default async function DividendsPage() {
  const data = await getDividendData();
  return <DividendsPageClient data={data} />;
}

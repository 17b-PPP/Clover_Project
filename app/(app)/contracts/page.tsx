import { getContracts } from "@/lib/data/contracts";
import { getMemberOptions } from "@/lib/data/members";
import { getEmployeeOptions } from "@/lib/data/employees";
import { ContractsPageClient } from "./ContractsPageClient";

export default async function ContractsPage() {
  const [contracts, members, employees] = await Promise.all([
    getContracts(),
    getMemberOptions(),
    getEmployeeOptions(),
  ]);

  return (
    <ContractsPageClient
      initialContracts={contracts}
      members={members}
      employees={employees}
    />
  );
}

import { getContracts } from "@/lib/data/contracts";
import { getMembers } from "@/lib/data/members";
import { getEmployees } from "@/lib/data/employees";
import { ContractsPageClient } from "./ContractsPageClient";

export default async function ContractsPage() {
  const [contracts, members, employees] = await Promise.all([
    getContracts(),
    getMembers(),
    getEmployees(),
  ]);

  return (
    <ContractsPageClient
      initialContracts={contracts}
      members={members}
      employees={employees}
    />
  );
}

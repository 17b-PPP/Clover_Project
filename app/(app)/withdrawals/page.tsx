import { getMemberOptions } from "@/lib/data/members";
import { getWithdrawals } from "@/lib/data/withdrawals";
import type { ComboboxOption } from "@/components/ui/Combobox";
import { WithdrawalsPageClient } from "./WithdrawalsPageClient";

export default async function WithdrawalsPage() {
  const [members, withdrawals] = await Promise.all([
    getMemberOptions(),
    getWithdrawals(),
  ]);

  const memberOptions: ComboboxOption[] = members
    .filter((m) => m.status === "Active")
    .map((m) => ({
      value: m.memberCode,
      label: `${m.memberCode} · ${m.firstName} ${m.lastName}`,
    }));

  return (
    <WithdrawalsPageClient
      memberOptions={memberOptions}
      withdrawals={withdrawals}
    />
  );
}

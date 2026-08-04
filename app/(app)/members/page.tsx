import { getMembers } from "@/lib/data/members";
import { MembersPageClient } from "./MembersPageClient";

export default async function MembersPage() {
  const members = await getMembers();
  return <MembersPageClient initialMembers={members} />;
}

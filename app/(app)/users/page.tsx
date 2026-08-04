import { getUsers } from "@/lib/data/users";
import { UsersPageClient } from "./UsersPageClient";

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersPageClient initialUsers={users} />;
}

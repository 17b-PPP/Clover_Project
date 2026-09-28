import { getEmployees } from "@/lib/data/employees";
import { getContracts } from "@/lib/data/contracts";
import { EmployeesPageClient } from "./EmployeesPageClient";

export default async function EmployeesPage() {
  const [employees, contracts] = await Promise.all([
    getEmployees(),
    getContracts(),
  ]);
  return (
    <EmployeesPageClient initialEmployees={employees} contracts={contracts} />
  );
}

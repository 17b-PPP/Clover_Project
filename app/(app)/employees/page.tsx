import { getEmployees } from "@/lib/data/employees";
import { EmployeesPageClient } from "./EmployeesPageClient";

export default async function EmployeesPage() {
  const employees = await getEmployees();
  return <EmployeesPageClient initialEmployees={employees} />;
}

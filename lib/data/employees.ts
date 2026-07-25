import { prisma } from "@/lib/prisma";
import type { Employee as PrismaEmployee } from "@prisma/client";
import type { Employee, EmployeeInput } from "@/lib/types";

function serialize(employee: PrismaEmployee): Employee {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    idCardNumber: employee.idCardNumber,
    phone: employee.phone,
    address: employee.address,
    postalCode: employee.postalCode,
    photoUrl: employee.photoUrl,
    status: employee.status,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

async function nextEmployeeCode(): Promise<string> {
  const existing = await prisma.employee.findMany({
    select: { employeeCode: true },
  });
  const maxCode = existing.reduce((max, e) => {
    const n = parseInt(e.employeeCode.replace("E-", ""), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `E-${String(maxCode + 1).padStart(4, "0")}`;
}

export async function getEmployees(): Promise<Employee[]> {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "asc" },
  });
  return employees.map(serialize);
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  const employee = await prisma.employee.findUnique({ where: { id } });
  return employee ? serialize(employee) : undefined;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const employeeCode = await nextEmployeeCode();
  const employee = await prisma.employee.create({
    data: {
      employeeCode,
      ...input,
      status: "ACTIVE",
    },
  });
  return serialize(employee);
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>
): Promise<Employee | undefined> {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: input,
    });
    return serialize(employee);
  } catch {
    return undefined;
  }
}

export async function setEmployeeStatus(
  id: string,
  status: Employee["status"]
): Promise<Employee | undefined> {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: { status },
    });
    return serialize(employee);
  } catch {
    return undefined;
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  await prisma.employee.delete({ where: { id } });
}

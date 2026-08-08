import { prisma } from "@/lib/prisma";
import type { Employee as PrismaEmployee } from "@prisma/client";
import type { Employee, EmployeeInput, EmployeeOption } from "@/lib/types";

function serialize(employee: PrismaEmployee): Employee {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    idCardNumber: employee.idCardNumber,
    dateOfBirth: employee.dateOfBirth.toISOString(),
    phone: employee.phone,
    address: employee.address,
    district: employee.district,
    province: employee.province,
    postalCode: employee.postalCode,
    photoUrl: employee.photoUrl,
    status: employee.status,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

async function nextEmployeeCode(): Promise<string> {
  const last = await prisma.employee.findFirst({
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });
  const n = last ? parseInt(last.employeeCode.replace("E-", ""), 10) : 0;
  return `E-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

export async function getEmployees(): Promise<Employee[]> {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "asc" },
  });
  return employees.map(serialize);
}

export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  return prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
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
      firstName: input.firstName,
      lastName: input.lastName,
      idCardNumber: input.idCardNumber,
      dateOfBirth: new Date(input.dateOfBirth),
      phone: input.phone,
      address: input.address,
      district: input.district,
      province: input.province,
      postalCode: input.postalCode,
      photoUrl: input.photoUrl,
      status: "Active",
    },
  });
  return serialize(employee);
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>
): Promise<Employee | undefined> {
  try {
    const { dateOfBirth, ...rest } = input;
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      },
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

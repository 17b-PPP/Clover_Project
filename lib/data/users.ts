import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Staff as PrismaStaff } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import type { User, UserInput } from "@/lib/types";

function serialize(staff: PrismaStaff): User {
  return {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    username: staff.username,
    email: staff.email,
    phone: staff.phone,
    dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.toISOString() : null,
    role: staff.role,
    status: staff.status,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

async function nextStaffCode(): Promise<string> {
  const last = await prisma.staff.findFirst({
    orderBy: { staffCode: "desc" },
    select: { staffCode: true },
  });
  const n = last ? parseInt(last.staffCode.replace("S-", ""), 10) : 0;
  return `S-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

export async function getUsers(): Promise<User[]> {
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });
  return staff.map(serialize);
}

export async function getUser(id: string): Promise<User | undefined> {
  const staff = await prisma.staff.findUnique({ where: { id } });
  return staff ? serialize(staff) : undefined;
}

export async function createUser(
  input: UserInput & { password: string; usingDefaultPassword: boolean }
): Promise<User> {
  const staffCode = await nextStaffCode();
  const { password, dateOfBirth, usingDefaultPassword, ...rest } = input;
  const staff = await prisma.staff.create({
    data: {
      staffCode,
      ...rest,
      dateOfBirth: new Date(dateOfBirth),
      password: hashPassword(password),
      usingDefaultPassword,
      status: "Active",
    },
  });
  return serialize(staff);
}

export async function updateUser(
  id: string,
  input: Partial<UserInput>
): Promise<User | undefined> {
  try {
    const { password, dateOfBirth, ...rest } = input;
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
        ...(password
          ? { password: hashPassword(password), usingDefaultPassword: false }
          : {}),
      },
    });
    return serialize(staff);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function setUserStatus(
  id: string,
  status: User["status"]
): Promise<User | undefined> {
  try {
    const staff = await prisma.staff.update({ where: { id }, data: { status } });
    return serialize(staff);
  } catch {
    return undefined;
  }
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.staff.delete({ where: { id } });
}

export async function isUsingDefaultPassword(id: string): Promise<boolean> {
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: { usingDefaultPassword: true },
  });
  return staff?.usingDefaultPassword ?? false;
}

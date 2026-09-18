import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Member as PrismaMember } from "@prisma/client";
import type { Member, MemberInput, MemberOption } from "@/lib/types";

function serialize(member: PrismaMember): Member {
  return {
    id: member.id,
    memberCode: member.memberCode,
    firstName: member.firstName,
    lastName: member.lastName,
    idCardNumber: member.idCardNumber,
    dateOfBirth: member.dateOfBirth.toISOString(),
    phone: member.phone,
    address: member.address,
    district: member.district,
    province: member.province,
    postalCode: member.postalCode,
    photoUrl: member.photoUrl,
    gardenName: member.gardenName,
    walletBalance: member.walletBalance.toNumber(),
    dividendBalance: member.dividendBalance.toNumber(),
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

async function nextMemberCode(): Promise<string> {
  const last = await prisma.member.findFirst({
    orderBy: { memberCode: "desc" },
    select: { memberCode: true },
  });
  const n = last ? parseInt(last.memberCode.replace("M-", ""), 10) : 0;
  return `M-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// Excludes photoUrl: the member table never renders photos, and a single
// oversized upload here would otherwise bloat every list-page load.
export async function getMembers(): Promise<Member[]> {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      idCardNumber: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      district: true,
      province: true,
      postalCode: true,
      gardenName: true,
      walletBalance: true,
      dividendBalance: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return members.map((member) => ({
    id: member.id,
    memberCode: member.memberCode,
    firstName: member.firstName,
    lastName: member.lastName,
    idCardNumber: member.idCardNumber,
    dateOfBirth: member.dateOfBirth.toISOString(),
    phone: member.phone,
    address: member.address,
    district: member.district,
    province: member.province,
    postalCode: member.postalCode,
    photoUrl: null,
    gardenName: member.gardenName,
    walletBalance: member.walletBalance.toNumber(),
    dividendBalance: member.dividendBalance.toNumber(),
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  }));
}

export async function getMemberOptions(): Promise<MemberOption[]> {
  return prisma.member.findMany({
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMember(id: string): Promise<Member | undefined> {
  const member = await prisma.member.findUnique({ where: { id } });
  return member ? serialize(member) : undefined;
}

// phone has no DB-level unique constraint, so duplicates must be checked
// at the app layer before create/update.
export async function memberPhoneExists(
  phone: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.member.findFirst({
    where: { phone, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

// idCardNumber is DB-unique too, but checked here as well so a request that
// duplicates both fields can report both at once instead of stopping at
// whichever error the database happens to throw first.
export async function memberIdCardNumberExists(
  idCardNumber: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.member.findFirst({
    where: { idCardNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

export async function createMember(input: MemberInput): Promise<Member> {
  const memberCode = await nextMemberCode();
  const member = await prisma.member.create({
    data: {
      memberCode,
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
      gardenName: input.gardenName,
      status: "Active",
    },
  });
  return serialize(member);
}

export async function updateMember(
  id: string,
  input: Partial<MemberInput>
): Promise<Member | undefined> {
  try {
    const { dateOfBirth, ...rest } = input;
    const member = await prisma.member.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      },
    });
    return serialize(member);
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

export async function setMemberStatus(
  id: string,
  status: Member["status"]
): Promise<Member | undefined> {
  try {
    const member = await prisma.member.update({
      where: { id },
      data: { status },
    });
    return serialize(member);
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

export async function deleteMember(id: string): Promise<void> {
  await prisma.member.delete({ where: { id } });
}

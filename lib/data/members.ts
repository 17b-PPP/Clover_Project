import { prisma } from "@/lib/prisma";
import type { Member as PrismaMember } from "@prisma/client";
import type { Member, MemberInput } from "@/lib/types";

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

export async function getMembers(): Promise<Member[]> {
  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
  });
  return members.map(serialize);
}

export async function getMember(id: string): Promise<Member | undefined> {
  const member = await prisma.member.findUnique({ where: { id } });
  return member ? serialize(member) : undefined;
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
  } catch {
    return undefined;
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
  } catch {
    return undefined;
  }
}

export async function deleteMember(id: string): Promise<void> {
  await prisma.member.delete({ where: { id } });
}

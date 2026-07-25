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
    phone: member.phone,
    address: member.address,
    postalCode: member.postalCode,
    photoUrl: member.photoUrl,
    balance: member.balance.toNumber(),
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

async function nextMemberCode(): Promise<string> {
  const last = await prisma.member.findMany({
    select: { memberCode: true },
  });
  const maxCode = last.reduce((max, m) => {
    const n = parseInt(m.memberCode.replace("M-", ""), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `M-${String(maxCode + 1).padStart(4, "0")}`;
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
      ...input,
      balance: 0,
      status: "ACTIVE",
    },
  });
  return serialize(member);
}

export async function updateMember(
  id: string,
  input: Partial<MemberInput>
): Promise<Member | undefined> {
  try {
    const member = await prisma.member.update({ where: { id }, data: input });
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

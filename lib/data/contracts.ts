import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { MePair } from "@prisma/client";
import type { Contract, ContractInput } from "@/lib/types";

const memberSummarySelect = {
  id: true,
  memberCode: true,
  firstName: true,
  lastName: true,
  status: true,
} as const satisfies Prisma.MemberSelect;

const employeeSummarySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  status: true,
} as const satisfies Prisma.EmployeeSelect;

const withParties = Prisma.validator<Prisma.MePairDefaultArgs>()({
  include: {
    member: { select: memberSummarySelect },
    employee: { select: employeeSummarySelect },
  },
});

type MePairWithParties = MePair & {
  member: Prisma.MemberGetPayload<{ select: typeof memberSummarySelect }>;
  employee: Prisma.EmployeeGetPayload<{ select: typeof employeeSummarySelect }>;
};

function serialize(pair: MePairWithParties): Contract {
  return {
    id: pair.id,
    pairCode: pair.pairCode,
    memberShare: pair.memberShare.toNumber(),
    employeeShare: pair.employeeShare.toNumber(),
    contractStartDate: pair.contractStartDate.toISOString(),
    contractEndDate: pair.contractEndDate
      ? pair.contractEndDate.toISOString()
      : null,
    status: pair.status,
    contractFileUrl: pair.contractFileUrl,
    createdAt: pair.createdAt.toISOString(),
    updatedAt: pair.updatedAt.toISOString(),
    member: {
      id: pair.member.id,
      code: pair.member.memberCode,
      firstName: pair.member.firstName,
      lastName: pair.member.lastName,
      status: pair.member.status,
    },
    employee: {
      id: pair.employee.id,
      code: pair.employee.employeeCode,
      firstName: pair.employee.firstName,
      lastName: pair.employee.lastName,
      status: pair.employee.status,
    },
  };
}

async function nextPairCode(): Promise<string> {
  const last = await prisma.mePair.findFirst({
    orderBy: { pairCode: "desc" },
    select: { pairCode: true },
  });
  const n = last ? parseInt(last.pairCode.replace("C-", ""), 10) : 0;
  return `C-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

export async function getContracts(): Promise<Contract[]> {
  const pairs = await prisma.mePair.findMany({
    ...withParties,
    orderBy: { createdAt: "asc" },
  });
  return pairs.map(serialize);
}

export async function getContract(id: string): Promise<Contract | undefined> {
  const pair = await prisma.mePair.findUnique({ where: { id }, ...withParties });
  return pair ? serialize(pair) : undefined;
}

export async function createContract(
  input: ContractInput
): Promise<Contract> {
  const [member, employee] = await Promise.all([
    prisma.member.findUnique({ where: { id: input.memberId } }),
    prisma.employee.findUnique({ where: { id: input.employeeId } }),
  ]);

  if (!member || member.status !== "Active") {
    throw new Error("สมาชิกที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }
  if (!employee || employee.status !== "Active") {
    throw new Error("ลูกจ้างที่เลือกถูกระงับการใช้งานหรือไม่มีอยู่ในระบบ");
  }

  const pairCode = await nextPairCode();
  const pair = await prisma.mePair.create({
    data: {
      pairCode,
      memberId: input.memberId,
      employeeId: input.employeeId,
      memberShare: input.memberShare,
      employeeShare: input.employeeShare,
      status: "Active",
    },
    ...withParties,
  });
  return serialize(pair);
}

export async function renewContract(
  id: string,
  shares: { memberShare: number; employeeShare: number }
): Promise<Contract | undefined> {
  const current = await prisma.mePair.findUnique({ where: { id } });
  if (!current) return undefined;

  const pairCode = await nextPairCode();
  const now = new Date();

  const [, newPair] = await prisma.$transaction([
    prisma.mePair.update({
      where: { id },
      data: { contractEndDate: now },
    }),
    prisma.mePair.create({
      data: {
        pairCode,
        memberId: current.memberId,
        employeeId: current.employeeId,
        memberShare: shares.memberShare,
        employeeShare: shares.employeeShare,
        contractStartDate: now,
        status: "Active",
      },
      ...withParties,
    }),
  ]);

  return serialize(newPair as MePairWithParties);
}

export async function getContractHistory(
  memberId: string,
  employeeId: string
): Promise<Contract[]> {
  const pairs = await prisma.mePair.findMany({
    where: { memberId, employeeId },
    ...withParties,
    orderBy: { contractStartDate: "desc" },
  });
  return pairs.map(serialize);
}

export async function setContractStatus(
  id: string,
  status: Contract["status"]
): Promise<Contract | undefined> {
  try {
    const pair = await prisma.mePair.update({
      where: { id },
      data: { status },
      ...withParties,
    });
    return serialize(pair);
  } catch {
    return undefined;
  }
}

export async function deleteContract(id: string): Promise<void> {
  await prisma.mePair.delete({ where: { id } });
}

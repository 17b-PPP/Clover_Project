import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Member, Employee, MePair } from "@prisma/client";
import type { Contract, ContractInput } from "@/lib/types";

const withParties = Prisma.validator<Prisma.MePairDefaultArgs>()({
  include: { member: true, employee: true },
});

type MePairWithParties = MePair & { member: Member; employee: Employee };

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
  const existing = await prisma.mePair.findMany({ select: { pairCode: true } });
  const maxCode = existing.reduce((max, p) => {
    const n = parseInt(p.pairCode.replace("C-", ""), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `C-${String(maxCode + 1).padStart(4, "0")}`;
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

export async function updateContract(
  id: string,
  input: Partial<ContractInput>
): Promise<Contract | undefined> {
  try {
    const pair = await prisma.mePair.update({
      where: { id },
      data: input,
      ...withParties,
    });
    return serialize(pair);
  } catch {
    return undefined;
  }
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

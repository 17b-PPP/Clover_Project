// =============================================================================
// server/lib/data/contracts.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการ "สัญญาจ้าง" (ตาราง MePair) — การจับคู่สมาชิก (เจ้าของสวน)
// กับลูกจ้าง พร้อมสัดส่วนแบ่งรายได้ (memberShare + employeeShare = 100)
// =============================================================================

import { prisma } from "../prisma.js";

// ฟิลด์ของสมาชิก/ลูกจ้างที่ดึงมาพร้อมสัญญา (เฉพาะที่ใช้แสดงผล)
const memberSummarySelect = {
  id: true,
  memberCode: true,
  firstName: true,
  lastName: true,
  status: true,
};

const employeeSummarySelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  status: true,
};

// ตัวเลือก include ที่ใช้ซ้ำทุก query: ดึงข้อมูลคู่สัญญาทั้งสองฝ่ายมาด้วย
const withParties = {
  include: {
    member: { select: memberSummarySelect },
    employee: { select: employeeSummarySelect },
  },
};

// แปลงแถว MePair (พร้อมคู่สัญญา) เป็นข้อมูลสัญญาที่ส่งให้หน้าเว็บ
function serialize(pair) {
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

// สร้างรหัสจับคู่ถัดไป เช่น C-0004 → C-0005
async function nextPairCode() {
  const last = await prisma.mePair.findFirst({
    orderBy: { pairCode: "desc" },
    select: { pairCode: true },
  });
  const n = last ? parseInt(last.pairCode.replace("C-", ""), 10) : 0;
  return `C-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// สัญญาทั้งหมด (เรียงตามวันที่สร้าง)
export async function getContracts() {
  const pairs = await prisma.mePair.findMany({
    ...withParties,
    orderBy: { createdAt: "asc" },
  });
  return pairs.map(serialize);
}

// สัญญา 1 ฉบับ — คืน undefined ถ้าไม่พบ
export async function getContract(id) {
  const pair = await prisma.mePair.findUnique({ where: { id }, ...withParties });
  return pair ? serialize(pair) : undefined;
}

// สร้างสัญญาใหม่
// ตรวจก่อนว่า: สมาชิกและลูกจ้างต้องใช้งานอยู่ และคู่นี้ต้องยังไม่มีสัญญาที่ใช้งานอยู่
export async function createContract(input) {
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

  const existingActivePair = await prisma.mePair.findFirst({
    where: {
      memberId: input.memberId,
      employeeId: input.employeeId,
      contractEndDate: null,
    },
  });
  if (existingActivePair) {
    throw new Error("สมาชิกและลูกจ้างคู่นี้มีสัญญาที่ยังใช้งานอยู่แล้ว");
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

// แก้ไขสัดส่วนรายได้ของสัญญา — คืน undefined ถ้าเกิดข้อผิดพลาด
export async function updateContractShares(id, shares) {
  try {
    const pair = await prisma.mePair.update({
      where: { id },
      data: {
        memberShare: shares.memberShare,
        employeeShare: shares.employeeShare,
      },
      ...withParties,
    });
    return serialize(pair);
  } catch {
    return undefined;
  }
}

// ประวัติสัญญาทั้งหมดของคู่สมาชิก–ลูกจ้างคู่หนึ่ง (ใหม่สุดก่อน)
export async function getContractHistory(memberId, employeeId) {
  const pairs = await prisma.mePair.findMany({
    where: { memberId, employeeId },
    ...withParties,
    orderBy: { contractStartDate: "desc" },
  });
  return pairs.map(serialize);
}

// เปลี่ยนสถานะสัญญา (ระงับ / เปิดใช้งาน)
export async function setContractStatus(id, status) {
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

// ลบสัญญาถาวร
export async function deleteContract(id) {
  await prisma.mePair.delete({ where: { id } });
}

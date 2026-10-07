// =============================================================================
// server/lib/data/members.js
// -----------------------------------------------------------------------------
// ฟังก์ชันอ่าน/เขียนข้อมูล "สมาชิก" (เจ้าของสวนยาง) ในฐานข้อมูล
//
// ข้อมูลที่ส่งออกไปให้หน้าเว็บ (Member) แปลงค่าให้เป็น JSON ธรรมดาแล้ว:
//   - วันที่เป็นข้อความ ISO
//   - ตัวเลขทศนิยม (Decimal) เป็น number
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// แปลงแถวจากฐานข้อมูลเป็นรูปแบบที่ส่งให้หน้าเว็บ
function serialize(member) {
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

// สร้างรหัสสมาชิกถัดไป เช่น รหัสล่าสุด M-0012 → M-0013
async function nextMemberCode() {
  const last = await prisma.member.findFirst({
    orderBy: { memberCode: "desc" },
    select: { memberCode: true },
  });
  const n = last ? parseInt(last.memberCode.replace("M-", ""), 10) : 0;
  return `M-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// รายชื่อสมาชิกทั้งหมด (เรียงตามวันที่สร้าง)
// ไม่ดึง photoUrl เพราะตารางสมาชิกไม่ได้แสดงรูป และรูปขนาดใหญ่จะทำให้
// การโหลดหน้ารายการช้าลงทุกครั้ง
export async function getMembers() {
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

// รายการสมาชิกแบบย่อ (รหัส ชื่อ สถานะ) สำหรับช่องเลือกในฟอร์มต่าง ๆ
export async function getMemberOptions() {
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

// ข้อมูลสมาชิก 1 คนแบบเต็ม (รวมรูปถ่าย) — คืน undefined ถ้าไม่พบ
export async function getMember(id) {
  const member = await prisma.member.findUnique({ where: { id } });
  return member ? serialize(member) : undefined;
}

// ตรวจว่าเบอร์โทรซ้ำกับสมาชิกคนอื่นหรือไม่
// (ฐานข้อมูลไม่ได้บังคับเบอร์โทรห้ามซ้ำ จึงต้องตรวจที่โค้ด)
// excludeId = id ของสมาชิกที่กำลังแก้ไข (ไม่นับตัวเอง)
export async function memberPhoneExists(phone, excludeId) {
  const existing = await prisma.member.findFirst({
    where: { phone, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

// ตรวจว่าเลขบัตรประชาชนซ้ำหรือไม่
// ฐานข้อมูลบังคับไม่ให้ซ้ำอยู่แล้ว แต่ตรวจตรงนี้ด้วยเพื่อให้แจ้งเตือน
// "ซ้ำทั้งเลขบัตรและเบอร์โทร" ได้พร้อมกันในครั้งเดียว
export async function memberIdCardNumberExists(idCardNumber, excludeId) {
  const existing = await prisma.member.findFirst({
    where: { idCardNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

// เพิ่มสมาชิกใหม่ (สถานะเริ่มต้น "Active")
export async function createMember(input) {
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

// แก้ไขข้อมูลสมาชิก — คืน undefined ถ้าไม่พบสมาชิก (รหัส error P2025)
export async function updateMember(id, input) {
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

// เปลี่ยนสถานะสมาชิก (Active = ใช้งาน, Inactive = ระงับ)
export async function setMemberStatus(id, status) {
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

// ลบสมาชิกออกจากฐานข้อมูลถาวร
export async function deleteMember(id) {
  await prisma.member.delete({ where: { id } });
}

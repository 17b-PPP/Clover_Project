// =============================================================================
// server/lib/data/employees.js
// -----------------------------------------------------------------------------
// ฟังก์ชันอ่าน/เขียนข้อมูล "ลูกจ้าง" (ผู้ส่งน้ำยางแทนเจ้าของสวน) ในฐานข้อมูล
// โครงสร้างเหมือน members.js แต่ไม่มีชื่อสวนและยอดเงิน
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

// แปลงแถวจากฐานข้อมูลเป็นรูปแบบที่ส่งให้หน้าเว็บ
function serialize(employee) {
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

// สร้างรหัสลูกจ้างถัดไป เช่น E-0007 → E-0008
async function nextEmployeeCode() {
  const last = await prisma.employee.findFirst({
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });
  const n = last ? parseInt(last.employeeCode.replace("E-", ""), 10) : 0;
  return `E-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// รายชื่อลูกจ้างทั้งหมด (ไม่ดึงรูปถ่าย เพื่อให้หน้ารายการโหลดเร็ว)
export async function getEmployees() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      idCardNumber: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      district: true,
      province: true,
      postalCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return employees.map((employee) => ({
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
    photoUrl: null,
    status: employee.status,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }));
}

// รายการลูกจ้างแบบย่อ สำหรับช่องเลือกในฟอร์ม
export async function getEmployeeOptions() {
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

// ข้อมูลลูกจ้าง 1 คนแบบเต็ม (รวมรูปถ่าย) — คืน undefined ถ้าไม่พบ
export async function getEmployee(id) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  return employee ? serialize(employee) : undefined;
}

// ตรวจเบอร์โทรซ้ำ (ไม่นับลูกจ้างที่กำลังแก้ไข)
export async function employeePhoneExists(phone, excludeId) {
  const existing = await prisma.employee.findFirst({
    where: { phone, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

// ตรวจเลขบัตรประชาชนซ้ำ (เพื่อรายงานพร้อมกับเบอร์โทรซ้ำได้ในครั้งเดียว)
export async function employeeIdCardNumberExists(idCardNumber, excludeId) {
  const existing = await prisma.employee.findFirst({
    where: { idCardNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}

// เพิ่มลูกจ้างใหม่ (สถานะเริ่มต้น "Active")
export async function createEmployee(input) {
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

// แก้ไขข้อมูลลูกจ้าง — คืน undefined ถ้าไม่พบ
export async function updateEmployee(id, input) {
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

// เปลี่ยนสถานะลูกจ้าง (ระงับ / เปิดใช้งาน)
export async function setEmployeeStatus(id, status) {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: { status },
    });
    return serialize(employee);
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

// ลบลูกจ้างถาวร
export async function deleteEmployee(id) {
  await prisma.employee.delete({ where: { id } });
}

// =============================================================================
// server/lib/data/users.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการบัญชี "ผู้ใช้งาน" (พนักงาน / ผู้ดูแลระบบ) ในตาราง Staff
// รหัสผ่านถูกเข้ารหัสก่อนบันทึกเสมอ และจะไม่ถูกส่งออกไปหน้าเว็บ
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { hashPassword } from "../auth.js";

// แปลงแถว Staff เป็นข้อมูลผู้ใช้งานที่ส่งให้หน้าเว็บ (ไม่มีรหัสผ่าน)
function serialize(staff) {
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

// สร้างรหัสพนักงานถัดไป เช่น S-0003 → S-0004
async function nextStaffCode() {
  const last = await prisma.staff.findFirst({
    orderBy: { staffCode: "desc" },
    select: { staffCode: true },
  });
  const n = last ? parseInt(last.staffCode.replace("S-", ""), 10) : 0;
  return `S-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// รายชื่อผู้ใช้งานทั้งหมด
export async function getUsers() {
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });
  return staff.map(serialize);
}

// ผู้ใช้งาน 1 คน — คืน undefined ถ้าไม่พบ
export async function getUser(id) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  return staff ? serialize(staff) : undefined;
}

// เพิ่มผู้ใช้งานใหม่
// input มี password (ที่ยังไม่เข้ารหัส) และ usingDefaultPassword
// (true = ใช้วันเกิดเป็นรหัสผ่านเริ่มต้น จะมีจุดแดงเตือนให้เปลี่ยนรหัส)
export async function createUser(input) {
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

// แก้ไขข้อมูลผู้ใช้งาน
// ถ้ามีการกรอกรหัสผ่านใหม่ จะเข้ารหัสแล้วบันทึก และถือว่าเลิกใช้รหัสตั้งต้นแล้ว
export async function updateUser(id, input) {
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

// เปลี่ยนสถานะผู้ใช้งาน — คืน undefined ถ้าเกิดข้อผิดพลาดใด ๆ
export async function setUserStatus(id, status) {
  try {
    const staff = await prisma.staff.update({ where: { id }, data: { status } });
    return serialize(staff);
  } catch {
    return undefined;
  }
}

// ลบผู้ใช้งานถาวร
export async function deleteUser(id) {
  await prisma.staff.delete({ where: { id } });
}

// ตรวจว่าผู้ใช้งานคนนี้ยังใช้รหัสผ่านตั้งต้น (วันเกิด) อยู่หรือไม่
// ใช้แสดงจุดแดงที่ปุ่มเฟืองในเมนูด้านซ้าย
export async function isUsingDefaultPassword(id) {
  const staff = await prisma.staff.findUnique({
    where: { id },
    select: { usingDefaultPassword: true },
  });
  return staff?.usingDefaultPassword ?? false;
}

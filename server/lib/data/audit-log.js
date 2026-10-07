// =============================================================================
// server/lib/data/audit-log.js
// -----------------------------------------------------------------------------
// อ่าน "ประวัติการใช้งาน" (ตาราง ActivityLog) สำหรับหน้าผู้ดูแลระบบ
// แปลงรหัสการกระทำ (เช่น CREATE_MEMBER) เป็นข้อความภาษาไทยที่อ่านง่าย
// =============================================================================

import { prisma } from "../prisma.js";

// ชื่อภาษาไทยของการกระทำแต่ละประเภท
const actionLabel = {
  LOGIN: "เข้าสู่ระบบ",
  LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
  LOGOUT: "ออกจากระบบ",
  CREATE_STAFF: "เพิ่มผู้ใช้งาน",
  UPDATE_STAFF: "แก้ไขข้อมูลผู้ใช้งาน",
  SUSPEND_STAFF: "ระงับ/เปิดใช้งานผู้ใช้งาน",
  DELETE_STAFF: "ลบผู้ใช้งาน",
  CREATE_MEMBER: "เพิ่มสมาชิก",
  UPDATE_MEMBER: "แก้ไขข้อมูลสมาชิก",
  SUSPEND_MEMBER: "ระงับ/เปิดใช้งานสมาชิก",
  DELETE_MEMBER: "ลบสมาชิก",
  CREATE_EMPLOYEE: "เพิ่มลูกจ้าง",
  UPDATE_EMPLOYEE: "แก้ไขข้อมูลลูกจ้าง",
  SUSPEND_EMPLOYEE: "ระงับ/เปิดใช้งานลูกจ้าง",
  DELETE_EMPLOYEE: "ลบลูกจ้าง",
  CREATE_CONTRACT: "เพิ่มสัญญาจ้าง",
  UPDATE_CONTRACT: "แก้ไขสัญญาจ้าง",
  SUSPEND_CONTRACT: "ระงับ/เปิดใช้งานสัญญาจ้าง",
  DELETE_CONTRACT: "ลบสัญญาจ้าง",
  CREATE_PURCHASE: "บันทึกรับซื้อน้ำยาง",
  CREATE_WITHDRAWAL: "เบิกเงินสะสม",
  CREATE_DIVIDEND: "จ่ายเงินปันผล",
  UPDATE_REFERENCE_PRICE: "บันทึกราคากลาง",
};

// แปลงแถว log (พร้อมข้อมูลผู้ใช้งาน) เป็นข้อมูลที่ส่งให้หน้าเว็บ
function serialize(log) {
  return {
    id: log.logId.toString(), // logId เป็น BigInt จึงต้องแปลงเป็นข้อความก่อนส่งเป็น JSON
    timestamp: log.actionTime.toISOString(),
    username: log.staff.username,
    role: log.staff.role,
    action: actionLabel[log.action],
    details: log.description ?? "-",
  };
}

// ประวัติการใช้งาน 200 รายการล่าสุด
export async function getAuditLogs() {
  const logs = await prisma.activityLog.findMany({
    include: { staff: true },
    orderBy: { actionTime: "desc" },
    take: 200,
  });
  return logs.map(serialize);
}

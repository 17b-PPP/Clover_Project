import { prisma } from "@/lib/prisma";
import type { ActivityLog, Staff } from "@prisma/client";
import type { AuditLogEntry } from "@/lib/types";

const actionLabel: Record<ActivityLog["action"], string> = {
  LOGIN: "เข้าสู่ระบบ",
  LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
  LOGOUT: "ออกจากระบบ",
  CREATE_STAFF: "เพิ่มผู้ใช้งาน",
  UPDATE_STAFF: "แก้ไขข้อมูลผู้ใช้งาน",
  SUSPEND_STAFF: "ระงับ/เปิดใช้งานผู้ใช้งาน",
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
};

type LogWithStaff = ActivityLog & { staff: Staff };

function serialize(log: LogWithStaff): AuditLogEntry {
  return {
    id: log.logId.toString(),
    timestamp: log.actionTime.toISOString(),
    username: log.staff.username,
    role: log.staff.role,
    action: actionLabel[log.action],
    details: log.description ?? "-",
  };
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const logs = await prisma.activityLog.findMany({
    include: { staff: true },
    orderBy: { actionTime: "desc" },
    take: 200,
  });
  return logs.map(serialize);
}

// =============================================================================
// server/lib/activity-log.js
// -----------------------------------------------------------------------------
// บันทึกประวัติการใช้งาน (Audit log) ของพนักงานลงตาราง ActivityLog
//
// ใช้หลังจากทำรายการสำคัญสำเร็จ เช่น เพิ่มสมาชิก แก้ไขสัญญา จ่ายปันผล
// จะบันทึกว่า "ใคร" (จาก session) ทำ "อะไร" กับ "ข้อมูลไหน"
// ถ้าไม่มี session (ไม่ได้เข้าสู่ระบบ) จะไม่บันทึกอะไร
//
// params: { action, targetType?, targetId?, description? }
// =============================================================================

import { prisma } from "./prisma.js";
import { getSession } from "./session.js";

export async function logActivity(req, params) {
  const session = getSession(req);
  if (!session) return;

  await prisma.activityLog.create({
    data: {
      staffId: session.staffId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      description: params.description,
    },
  });
}

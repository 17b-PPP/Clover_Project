// =============================================================================
// server/lib/layout-data.js
// -----------------------------------------------------------------------------
// ข้อมูลของ "โครงหน้า" (layout) ที่เมนูด้านซ้ายต้องใช้
//
// เดิม app/(app)/layout.tsx ของ Next.js อ่าน session และสถานะรหัสผ่านตั้งต้น
// แล้วส่งให้ Sidebar ตอนสร้างหน้า เวอร์ชันนี้ทำแบบเดียวกัน:
//   - pages.routes.js ฝังข้อมูลนี้ลงในหน้า HTML ตอนส่งหน้า (เมนูจึงขึ้นครบทันที)
//   - /api/page-data/app-layout ส่งข้อมูลเดียวกันนี้ เมื่อหน้าเว็บต้องการโหลดใหม่
//     (เช่น หลังเปลี่ยนรหัสผ่าน จุดแดงที่ปุ่มเฟืองจะได้หายไป)
// =============================================================================

import { getSession } from "./session.js";
import { isUsingDefaultPassword } from "./data/users.js";

// คืน { currentUser: ข้อมูลผู้ใช้จาก session (หรือ null), usingDefaultPassword }
export async function loadAppLayoutData(req) {
  const session = getSession(req);
  const usingDefaultPassword = session
    ? await isUsingDefaultPassword(session.staffId)
    : false;
  return { currentUser: session, usingDefaultPassword };
}

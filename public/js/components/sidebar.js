// =============================================================================
// public/js/components/sidebar.js
// -----------------------------------------------------------------------------
// การทำงานของเมนูด้านซ้ายฝั่งพนักงาน (โครง HTML อยู่ใน pages/partials/sidebar.html)
//
//   - ไฮไลต์เมนูของหน้าที่เปิดอยู่
//   - แสดงชื่อผู้ใช้ / บทบาท จากข้อมูลที่เซิร์ฟเวอร์ฝังไว้ในหน้า (layout-data)
//   - แสดงกลุ่มเมนู Admin เฉพาะผู้ดูแลระบบ
//   - ปุ่มเฟืองเปลี่ยนรหัสผ่าน (เฉพาะพนักงาน) + จุดแดงถ้ายังใช้รหัสผ่านตั้งต้น
//   - ปุ่มออกจากระบบ
//
// ทุกหน้าของพนักงานเรียก initSidebar() เป็นอย่างแรก
// =============================================================================

import { byId, readLayoutData } from "../core/dom.js";
import { createChangePasswordDialog } from "./change-password-dialog.js";

// ชื่อบทบาทภาษาไทย
const roleLabel = {
  ADMIN: "ผู้ดูแลระบบ",
  STAFF: "พนักงาน",
};

export function initSidebar() {
  // ข้อมูลโครงหน้า { currentUser, usingDefaultPassword }
  let layout = readLayoutData() ?? { currentUser: null, usingDefaultPassword: false };
  let loggingOut = false;

  // ---------------------------------------------------------------------------
  // ไฮไลต์เมนูที่ URL ปัจจุบันขึ้นต้นด้วยลิงก์ของเมนูนั้น
  // ---------------------------------------------------------------------------
  const pathname = window.location.pathname;
  for (const link of document.querySelectorAll("#app-sidebar .nav-link")) {
    const isActive = pathname.startsWith(link.getAttribute("href"));
    link.classList.toggle("is-active", isActive);
  }

  // ---------------------------------------------------------------------------
  // แสดงข้อมูลผู้ใช้ตามข้อมูลโครงหน้า
  // ---------------------------------------------------------------------------
  function renderUser() {
    const user = layout.currentUser;

    // กลุ่มเมนู Admin
    byId("sidebar-admin-group").hidden = !(user && user.role === "ADMIN");

    // ชื่อ + บทบาท
    byId("sidebar-user").hidden = !user;
    if (!user) return;
    byId("sidebar-user-name").textContent = `${user.firstName} ${user.lastName}`;
    byId("sidebar-user-role").textContent = `${roleLabel[user.role]} · @${user.username}`;

    // ปุ่มเฟือง (เฉพาะพนักงาน STAFF)
    const gearButton = byId("change-password-button");
    gearButton.hidden = user.role !== "STAFF";
    const label = layout.usingDefaultPassword
      ? "เปลี่ยนรหัสผ่าน (กำลังใช้รหัสผ่านตั้งต้น)"
      : "เปลี่ยนรหัสผ่าน";
    gearButton.setAttribute("aria-label", label);
    gearButton.title = label;
    byId("default-password-dot").hidden = !layout.usingDefaultPassword;
  }

  // โหลดข้อมูลโครงหน้าใหม่จากเซิร์ฟเวอร์ (หลังเปลี่ยนรหัสผ่านสำเร็จ)
  async function refreshLayout() {
    try {
      const res = await fetch("/api/page-data/app-layout");
      if (res.ok) {
        layout = await res.json();
        renderUser();
      }
    } catch {
      // ถ้าโหลดไม่สำเร็จ เมนูจะแสดงข้อมูลเดิมต่อไป
    }
  }

  // ---------------------------------------------------------------------------
  // หน้าต่างเปลี่ยนรหัสผ่าน
  // ---------------------------------------------------------------------------
  const changePasswordDialog = createChangePasswordDialog({ onSuccess: refreshLayout });
  byId("change-password-button").addEventListener("click", () => {
    changePasswordDialog.open();
  });

  // ---------------------------------------------------------------------------
  // ออกจากระบบ
  // ---------------------------------------------------------------------------
  const logoutButton = byId("logout-button");
  const logoutLabel = byId("logout-label");

  function renderLogout() {
    logoutButton.disabled = loggingOut;
    logoutLabel.textContent = loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ";
  }

  logoutButton.addEventListener("click", async () => {
    loggingOut = true;
    renderLogout();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      loggingOut = false;
      renderLogout();
    }
  });

  renderUser();
}

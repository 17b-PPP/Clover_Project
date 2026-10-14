// =============================================================================
// ไฟล์: explained_code/11_จัดการผู้ใช้งาน_users.js
// หน้าที่: ควบคุมการทำงานของหน้า "ตรวจสอบสิทธิ์ผู้ใช้งาน" (User & Role Management)
// ไฟล์ HTML ที่คู่กัน: pages/users.html
// เส้นทาง URL: /users [เฉพาะผู้ดูแลระบบ ADMIN เท่านั้น]
// ตารางฐานข้อมูลหลัก: Staff
// ความสำคัญทางธุรกิจ:
//   จัดการบัญชีผู้ใช้งานระบบของเจ้าหน้าที่สหกรณ์ (STAFF) และผู้ดูแลระบบ (ADMIN)
//   รองรับการเพิ่ม, แก้ไข, กำหนดสิทธิ์ Role, ระงับบัญชี และรีเซ็ตรหัสผ่าน
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createModal } from "../public/js/components/modal.js";
import { createDeleteDialog, createStatusDialog } from "../public/js/components/status-dialogs.js";

initSidebar();

const state = {
  users: [],  // รายชื่อบัญชีผู้ใช้งานระบบทั้งหมด (Staff)
  search: "",
  form: { open: false, mode: "add", entity: null },
};

/**
 * กรองรายชื่อผู้ใช้งานตามคำค้นหา
 */
function filteredUsers() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.users;
  return state.users.filter((u) =>
    [u.firstName, u.lastName, u.username, u.email].join(" ").toLowerCase().includes(q)
  );
}

/**
 * สร้างแถวตารางผู้ใช้งาน 1 แถว
 */
function createRow(user) {
  const row = cloneTemplate("user-row-template");
  const isActive = user.status === "Active";

  // แสดงป้ายบอกบทบาท (Role Badge): ADMIN (สีม่วง) หรือ STAFF (สีฟ้า)
  row.querySelector('[data-slot="role-admin"]').hidden = user.role !== "ADMIN";
  row.querySelector('[data-slot="role-staff"]').hidden = user.role === "ADMIN";

  setSlot(row, "fullName", `${user.firstName} ${user.lastName}`);
  setSlot(row, "username", user.username);
  setSlot(row, "email", user.email);

  row.querySelector('[data-slot="badge-active"]').hidden = !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = isActive;

  const toggleButton = action(row, "toggle-status");
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";

  const deleteButton = action(row, "delete");
  deleteButton.hidden = user.status !== "Inactive";

  action(row, "view").addEventListener("click", () => updateForm({ entity: user, mode: "view", open: true }));
  action(row, "edit").addEventListener("click", () => updateForm({ entity: user, mode: "edit", open: true }));
  toggleButton.addEventListener("click", () => statusDialog.open(user));
  deleteButton.addEventListener("click", () => deleteDialog.open(user));

  return row;
}

function renderTable() {
  const users = filteredUsers();
  byId("user-empty").hidden = users.length !== 0;
  byId("user-table").hidden = users.length === 0;
  byId("user-rows").replaceChildren(...users.map(createRow));
}

// โหลดข้อมูลเริ่มต้น (จะถูก Access Guard บล็อกถ้า Role ไม่ใช่ ADMIN)
try {
  const data = await loadPageData("users");
  state.users = data.users;
  renderTable();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

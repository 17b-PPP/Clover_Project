// =============================================================================
// ไฟล์: explained_code/03_จัดการสมาชิก_members.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการสมาชิก" (Member Management)
// ไฟล์ HTML ที่คู่กัน: pages/members.html
// เส้นทาง URL: /members
// API ที่เกี่ยวข้อง:
//   - GET /api/page-data/members : โหลดรายชื่อสมาชิกทั้งหมด
//   - GET /api/members/:id        : ดึงข้อมูลสมาชิกรายคน
//   - POST /api/members           : เพิ่มสมาชิกใหม่
//   - PUT /api/members/:id        : แก้ไขข้อมูลสมาชิก
//   - PATCH /api/members/:id/status : ระงับ (Inactive) หรือเปิดใช้งาน (Active)
//   - DELETE /api/members/:id     : ลบสมาชิก (ทำได้เฉพาะคนที่สถานะ Inactive)
// =============================================================================

// -----------------------------------------------------------------------------
// [ส่วนที่ 1] การนำเข้าโมดูล (Imports)
// -----------------------------------------------------------------------------
import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { formatCurrency } from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createPersonFormDialog } from "../public/js/components/person-form-dialog.js";
import { createDeleteDialog, createStatusDialog } from "../public/js/components/status-dialogs.js";

// เรียกใช้งานเมนูด้านซ้าย (Sidebar) ให้เปิด-ปิดและไฮไลต์เมนูปัจจุบัน
initSidebar();

// -----------------------------------------------------------------------------
// [ส่วนที่ 2] การจัดเก็บสถานะของหน้า (State Management)
// -----------------------------------------------------------------------------
// state คือหัวใจของหน้านี้ ทำหน้าที่เป็น Single Source of Truth
const state = {
  members: [], // อาร์เรย์เก็บข้อมูลสมาชิกทั้งหมดที่โหลดมาจากเซิร์ฟเวอร์
  search: "",  // ข้อความค้นหาที่ผู้ใช้กำลังพิมพ์อยู่ในช่องค้นหา
  // สถานะของฟอร์ม Modal: เปิดอยู่หรือไม่, โหมด (add/view/edit), สมาชิกที่เลือก, กำลังโหลดหรือไม่
  form: { open: false, mode: "add", entity: null, loading: false },
};

// -----------------------------------------------------------------------------
// [ส่วนที่ 3] การกรองข้อมูลและการวาดตาราง (Filter & Render Table)
// -----------------------------------------------------------------------------

/**
 * ฟังก์ชัน: filteredMembers
 * หน้าที่: กรองรายชื่อสมาชิกตามคำค้นหา (ค้นหาจาก รหัสสมาชิก, ชื่อ, นามสกุล, หรือเบอร์โทร)
 * @returns {Array} รายชื่อสมาชิกที่ตรงกับเงื่อนไข
 */
function filteredMembers() {
  const q = state.search.trim().toLowerCase();
  // ถ้าไม่มีคำค้นหา ให้คืนค่าสมาชิกทั้งหมด
  if (!q) return state.members;

  // กรองโดยรวมข้อมูลสำคัญเป็นข้อความเดียว แล้วตรวจสอบว่ามีคำค้นหาอยู่หรือไม่
  return state.members.filter((m) =>
    [m.memberCode, m.firstName, m.lastName, m.phone].join(" ").toLowerCase().includes(q)
  );
}

/**
 * ฟังก์ชัน: createRow
 * หน้าที่: สร้าง Element แถวตาราง (<tr>) จำนวน 1 แถว สำหรับสมาชิก 1 คน
 * โดย Clone มาจาก <template id="member-row-template"> ใน HTML เพื่อประสิทธิภาพและความปลอดภัย
 * @param {Object} member - ข้อมูลสมาชิก
 * @returns {DocumentFragment|Element} แถวตารางที่พร้อมนำไปแสดงผล
 */
function createRow(member) {
  // คัดลอกโครงสร้าง HTML จาก template
  const row = cloneTemplate("member-row-template");
  const isActive = member.status === "Active";

  // ใส่ข้อมูลลงในช่อง (Slots) ผ่าน .textContent ป้องกันปัญหา XSS
  setSlot(row, "memberCode", member.memberCode);
  setSlot(row, "fullName", `${member.firstName} ${member.lastName}`);
  setSlot(row, "idCardNumber", member.idCardNumber);
  setSlot(row, "walletBalance", formatCurrency(member.walletBalance));

  // แสดงป้ายสถานะ (Badge): ซ่อนอันที่ไม่ตรงกับสถานะจริง
  row.querySelector('[data-slot="badge-active"]').hidden = !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = isActive;

  // ปุ่มสลับสถานะ: ถ้า Active ปุ่มจะเป็นสีแดงเขียนว่า "ระงับ"
  // ถ้า Inactive ปุ่มจะเป็นสีเทาเขียนว่า "เปิดใช้งาน"
  const toggleButton = action(row, "toggle-status");
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";

  // ปุ่มลบ: จะแสดงเฉพาะสมาชิกที่ถูก "ระงับ (Inactive)" แล้วเท่านั้น
  // กฎนี้ช่วยป้องกันไม่ให้เจ้าหน้าที่เผลอกดลบสมาชิกที่ยังใช้งานอยู่
  const deleteButton = action(row, "delete");
  deleteButton.hidden = member.status !== "Inactive";

  // ผูกเหตุการณ์คลิกกับปุ่มต่างๆ ในแถวนี้
  action(row, "view").addEventListener("click", () => openViewForm(member));
  action(row, "edit").addEventListener("click", () => openEditForm(member));
  toggleButton.addEventListener("click", () => statusDialog.open(member));
  deleteButton.addEventListener("click", () => deleteDialog.open(member));

  return row;
}

/**
 * ฟังก์ชัน: renderTable
 * หน้าที่: วาดตารางใหม่ทั้งหมดตามข้อมูลใน state
 */
function renderTable() {
  const members = filteredMembers();

  // จัดการการแสดงผลกรณีไม่พบข้อมูล
  byId("member-empty").hidden = members.length !== 0;
  byId("member-table").hidden = members.length === 0;

  // ใช้ .replaceChildren() ลบแถวเก่าและใส่แถวใหม่ทั้งหมดลงใน <tbody> อย่างรวดเร็ว
  byId("member-rows").replaceChildren(...members.map(createRow));
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 4] หน้าต่างฟอร์มสมาชิก (Person Form Dialog Component)
// -----------------------------------------------------------------------------

// สร้าง Dialog ฟอร์มส่วนกลางที่รองรับทั้งการ เพิ่ม / ดู / แก้ไข ข้อมูลสมาชิก
const formDialog = createPersonFormDialog({
  prefix: "member",
  titles: {
    add: "เพิ่มสมาชิกใหม่",
    view: "ข้อมูลสมาชิก",
    edit: "แก้ไขข้อมูลสมาชิก",
  },
  emptyForm: {
    firstName: "",
    lastName: "",
    idCardNumber: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    district: "",
    province: "",
    postalCode: "",
    gardenName: "",
    photoUrl: null,
  },
  // เมื่อบันทึกฟอร์มสำเร็จ (เพิ่มหรือแก้ไข)
  onSubmitSuccess: (saved) => {
    if (state.form.mode === "add") {
      // เพิ่มสมาชิกใหม่ไว้บนสุดของตาราง
      state.members = [saved, ...state.members];
    } else {
      // อัปเดตข้อมูลของสมาชิกเดิมในอาร์เรย์
      state.members = state.members.map((m) => (m.id === saved.id ? saved : m));
    }
    renderTable();
  },
  // ปลายทาง API สำหรับส่งข้อมูลบันทึก
  submitUrl: () => (state.form.mode === "add" ? "/api/members" : `/api/members/${state.form.entity.id}`),
  submitMethod: () => (state.form.mode === "add" ? "POST" : "PUT"),
  onClose: () => {
    state.form = { open: false, mode: "add", entity: null, loading: false };
  },
});

/**
 * เปิดฟอร์มดูข้อมูล (View Mode)
 * โหลดข้อมูลเต็มจากเซิร์ฟเวอร์ (เช่น ที่อยู่เต็ม และรูปถ่าย) มาแสดง
 */
async function openViewForm(member) {
  state.form = { open: true, mode: "view", entity: member, loading: true };
  formDialog.open({ mode: "view", loading: true, data: null });
  try {
    const res = await fetch(`/api/members/${member.id}`);
    if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const full = await res.json();
    state.form = { open: true, mode: "view", entity: full, loading: false };
    formDialog.open({ mode: "view", loading: false, data: full });
  } catch (error) {
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    formDialog.close();
  }
}

/**
 * เปิดฟอร์มแก้ไขข้อมูล (Edit Mode)
 */
async function openEditForm(member) {
  state.form = { open: true, mode: "edit", entity: member, loading: true };
  formDialog.open({ mode: "edit", loading: true, data: null });
  try {
    const res = await fetch(`/api/members/${member.id}`);
    if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const full = await res.json();
    state.form = { open: true, mode: "edit", entity: full, loading: false };
    formDialog.open({ mode: "edit", loading: false, data: full });
  } catch (error) {
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    formDialog.close();
  }
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 5] กล่องยืนยันระงับ/เปิดใช้งาน และลบข้อมูล (Status & Delete Dialogs)
// -----------------------------------------------------------------------------

// กล่องยืนยันการเปลี่ยนสถานะ Active <-> Inactive
const statusDialog = createStatusDialog({
  entityName: "สมาชิก",
  getName: (m) => `${m.memberCode} ${m.firstName} ${m.lastName}`,
  url: (m) => `/api/members/${m.id}/status`,
  onSuccess: (updated) => {
    // อัปเดตสถานะใน state และวาดตารางใหม่
    state.members = state.members.map((m) => (m.id === updated.id ? updated : m));
    renderTable();
  },
});

// กล่องยืนยันการลบสมาชิกออกจากระบบ
const deleteDialog = createDeleteDialog({
  entityName: "สมาชิก",
  getName: (m) => `${m.memberCode} ${m.firstName} ${m.lastName}`,
  url: (m) => `/api/members/${m.id}`,
  onSuccess: (deletedId) => {
    // นำสมาชิกที่ถูกลบออกจาก state แล้ววาดตารางใหม่
    state.members = state.members.filter((m) => m.id !== deletedId);
    renderTable();
  },
});

// -----------------------------------------------------------------------------
// [ส่วนที่ 6] ผูกเหตุการณ์ปุ่มค้นหาและเพิ่มสมาชิก (Event Listeners)
// -----------------------------------------------------------------------------

// ดักจับการพิมพ์ในช่องค้นหา: เมื่อพิมพ์ตัวอักษรใดๆ ให้กรองตารางทันที
byId("member-search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderTable();
});

// ปุ่ม "เพิ่มสมาชิกใหม่" ด้านบนตาราง
byId("add-member-button").addEventListener("click", () => {
  state.form = { open: true, mode: "add", entity: null, loading: false };
  formDialog.open({ mode: "add", loading: false, data: null });
});

// -----------------------------------------------------------------------------
// [ส่วนที่ 7] เริ่มต้นโหลดข้อมูลของหน้า (Page Initialization)
// -----------------------------------------------------------------------------
try {
  // ดึงข้อมูลสมาชิกเริ่มต้นจาก API /api/page-data/members
  const data = await loadPageData("members");
  state.members = data.members;
  renderTable();
  byId("page-content").hidden = false; // แสดงเนื้อหาเมื่อโหลดเสร็จ
} catch (error) {
  // หากเชื่อมต่อไม่ได้ แสดงหน้าจอแจ้งเตือนข้อผิดพลาด
  showPageLoadError(byId("page-content"), error);
}

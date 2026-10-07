// =============================================================================
// public/js/pages/members.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการสมาชิก" (pages/members.html)
//
// ขั้นตอนหลัก:
//   1. โหลดรายชื่อสมาชิกจาก /api/page-data/members แล้วแสดงในตาราง
//   2. ค้นหาด้วยรหัส ชื่อ นามสกุล หรือเบอร์โทร (กรองในหน้าเว็บทันทีที่พิมพ์)
//   3. ปุ่มในแต่ละแถว: ดูข้อมูล / แก้ไข / ระงับ-เปิดใช้งาน / ลบ (เฉพาะที่ถูกระงับ)
//   4. ทุกการเปลี่ยนแปลงส่งไป /api/members แล้วอัปเดตตารางตามผลที่ได้
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { formatCurrency } from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createPersonFormDialog } from "../components/person-form-dialog.js";
import { createDeleteDialog, createStatusDialog } from "../components/status-dialogs.js";

initSidebar();

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  members: [], // รายชื่อสมาชิกทั้งหมด
  search: "", // ข้อความค้นหา
  // หน้าต่างฟอร์ม: เปิดอยู่ไหม, โหมด, สมาชิกที่เลือก, กำลังโหลดข้อมูลเต็มอยู่ไหม
  form: { open: false, mode: "add", entity: null, loading: false },
};

// -----------------------------------------------------------------------------
// ตารางสมาชิก
// -----------------------------------------------------------------------------

// สมาชิกที่ตรงกับคำค้นหา (เทียบกับ รหัส ชื่อ นามสกุล เบอร์โทร)
function filteredMembers() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.members;
  return state.members.filter((m) =>
    [m.memberCode, m.firstName, m.lastName, m.phone].join(" ").toLowerCase().includes(q)
  );
}

// สร้างแถวตาราง 1 แถว จาก template
function createRow(member) {
  const row = cloneTemplate("member-row-template");
  const isActive = member.status === "Active";

  setSlot(row, "memberCode", member.memberCode);
  setSlot(row, "fullName", `${member.firstName} ${member.lastName}`);
  setSlot(row, "idCardNumber", member.idCardNumber);
  setSlot(row, "walletBalance", formatCurrency(member.walletBalance));
  row.querySelector('[data-slot="badge-active"]').hidden = !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = isActive;

  // ปุ่มระงับ (แดง) หรือเปิดใช้งาน (ขาว) ขึ้นกับสถานะปัจจุบัน
  const toggleButton = action(row, "toggle-status");
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";

  // ปุ่มลบแสดงเฉพาะสมาชิกที่ถูกระงับแล้ว
  const deleteButton = action(row, "delete");
  deleteButton.hidden = member.status !== "Inactive";

  action(row, "view").addEventListener("click", () => openViewForm(member));
  action(row, "edit").addEventListener("click", () => openEditForm(member));
  toggleButton.addEventListener("click", () => statusDialog.open(member));
  deleteButton.addEventListener("click", () => deleteDialog.open(member));
  return row;
}

// วาดตารางใหม่ทั้งหมดตามสถานะปัจจุบัน
function renderTable() {
  const members = filteredMembers();
  byId("member-empty").hidden = members.length !== 0;
  byId("member-table").hidden = members.length === 0;
  byId("member-rows").replaceChildren(...members.map(createRow));
}

// -----------------------------------------------------------------------------
// หน้าต่างฟอร์มสมาชิก
// -----------------------------------------------------------------------------
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
    photoUrl: null,
    gardenName: null,
  },
  // แปลงข้อมูลสมาชิกเป็นค่าในฟอร์ม (วันเกิดใช้เฉพาะส่วน YYYY-MM-DD)
  fromEntity: (member) => ({
    firstName: member.firstName,
    lastName: member.lastName,
    idCardNumber: member.idCardNumber,
    dateOfBirth: member.dateOfBirth.slice(0, 10),
    phone: member.phone,
    address: member.address,
    district: member.district,
    province: member.province,
    postalCode: member.postalCode,
    photoUrl: member.photoUrl,
    gardenName: member.gardenName,
  }),
  onSubmit: handleFormSubmit,
  onClose: () => updateForm({ open: false }),
  onRequestEdit: () => updateForm({ mode: "edit" }),
});

// เปลี่ยนค่าของฟอร์ม แล้วแจ้งหน้าต่างให้แสดงผลตามค่าใหม่
function updateForm(changes) {
  Object.assign(state.form, changes);
  formDialog.sync(state.form);
}

function openAddForm() {
  updateForm({ entity: null, mode: "add", open: true });
}

// ตารางไม่มีรูปถ่าย (ตัดออกเพื่อให้โหลดเร็ว) จึงต้องดึงข้อมูลเต็มเมื่อเปิดดู/แก้ไข
async function fetchFullMember(id) {
  const res = await fetch(`/api/members/${id}`);
  if (!res.ok) {
    throw new Error("ไม่สามารถโหลดข้อมูลสมาชิกได้");
  }
  return res.json();
}

// เปิดหน้าต่างพร้อมไอคอนโหลด → ดึงข้อมูลเต็ม → แสดงฟอร์ม
async function openFormWithFullMember(member, mode) {
  updateForm({ entity: null, mode, loading: true, open: true });
  try {
    const full = await fetchFullMember(member.id);
    updateForm({ entity: full, loading: false });
  } catch {
    alert("ไม่สามารถโหลดข้อมูลสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
    updateForm({ open: false, loading: false });
  }
}

function openViewForm(member) {
  openFormWithFullMember(member, "view");
}

function openEditForm(member) {
  openFormWithFullMember(member, "edit");
}

// บันทึกฟอร์ม: โหมดเพิ่ม → POST, โหมดแก้ไข → PATCH
async function handleFormSubmit(input) {
  if (state.form.mode === "add") {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถเพิ่มสมาชิกได้");
    }
    state.members = [...state.members, data];
  } else if (state.form.mode === "edit" && state.form.entity) {
    const res = await fetch(`/api/members/${state.form.entity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
    }
    state.members = state.members.map((m) => (m.id === data.id ? data : m));
  }
  renderTable();
}

// -----------------------------------------------------------------------------
// หน้าต่างระงับ/เปิดใช้งาน และหน้าต่างลบ
// -----------------------------------------------------------------------------

// เติมชื่อ + รหัสสมาชิกลงในข้อความของหน้าต่าง
function fillMemberText(overlay, member) {
  setSlot(overlay, "name", `${member.firstName} ${member.lastName}`);
  setSlot(overlay, "code", member.memberCode);
}

const statusDialog = createStatusDialog(byId("member-status-modal"), {
  titles: { suspend: "ระงับสมาชิก", activate: "เปิดใช้งานสมาชิก" },
  fill: fillMemberText,
  // สลับสถานะ แล้วแทนที่ข้อมูลสมาชิกในตารางด้วยข้อมูลที่เซิร์ฟเวอร์ตอบกลับมา
  onConfirm: async (member) => {
    const nextStatus = member.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    state.members = state.members.map((m) => (m.id === data.id ? data : m));
    renderTable();
  },
});

const deleteDialog = createDeleteDialog(byId("member-delete-modal"), {
  fill: fillMemberText,
  errorFallback: "ไม่สามารถลบสมาชิกได้",
  onConfirm: async (member) => {
    const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสมาชิกได้");
    }
    state.members = state.members.filter((m) => m.id !== member.id);
    renderTable();
  },
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
byId("add-member-button").addEventListener("click", openAddForm);

byId("member-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTable();
});

try {
  const data = await loadPageData("members");
  state.members = data.initialMembers;
  renderTable();
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false;
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

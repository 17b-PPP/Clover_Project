// =============================================================================
// ไฟล์: explained_code/04_จัดการลูกจ้าง_employees.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการลูกจ้าง" (Employee Management)
// ไฟล์ HTML ที่คู่กัน: pages/employees.html
// เส้นทาง URL: /employees
// API ที่เกี่ยวข้อง:
//   - GET /api/page-data/employees : โหลดรายชื่อลูกจ้างทั้งหมด
//   - POST /api/employees           : เพิ่มลูกจ้างใหม่ (รหัสขึ้นต้นด้วย E-xxx)
//   - PUT /api/employees/:id        : แก้ไขข้อมูลลูกจ้าง
//   - PATCH /api/employees/:id/status : ระงับ (Inactive) หรือเปิดใช้งาน (Active)
//   - DELETE /api/employees/:id     : ลบลูกจ้าง (เฉพาะสถานะ Inactive)
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createPersonFormDialog } from "../public/js/components/person-form-dialog.js";
import { createDeleteDialog, createStatusDialog } from "../public/js/components/status-dialogs.js";

initSidebar();

// สถานะของหน้า
const state = {
  employees: [], // รายชื่อลูกจ้างทั้งหมด
  search: "",    // คำค้นหา
  form: { open: false, mode: "add", entity: null, loading: false },
};

/**
 * กรองรายชื่อลูกจ้างตามคำค้นหา (รหัสลูกจ้าง, ชื่อ, นามสกุล, เบอร์โทร)
 */
function filteredEmployees() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.employees;
  return state.employees.filter((e) =>
    [e.employeeCode, e.firstName, e.lastName, e.phone].join(" ").toLowerCase().includes(q)
  );
}

/**
 * สร้างแถวตารางลูกจ้าง 1 แถวจาก template
 */
function createRow(employee) {
  const row = cloneTemplate("employee-row-template");
  const isActive = employee.status === "Active";

  setSlot(row, "employeeCode", employee.employeeCode);
  setSlot(row, "fullName", `${employee.firstName} ${employee.lastName}`);
  setSlot(row, "idCardNumber", employee.idCardNumber);
  setSlot(row, "phone", employee.phone);

  row.querySelector('[data-slot="badge-active"]').hidden = !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = isActive;

  const toggleButton = action(row, "toggle-status");
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";

  const deleteButton = action(row, "delete");
  deleteButton.hidden = employee.status !== "Inactive";

  action(row, "view").addEventListener("click", () => openViewForm(employee));
  action(row, "edit").addEventListener("click", () => openEditForm(employee));
  toggleButton.addEventListener("click", () => statusDialog.open(employee));
  deleteButton.addEventListener("click", () => deleteDialog.open(employee));
  return row;
}

/**
 * วาดตารางลูกจ้างใหม่
 */
function renderTable() {
  const employees = filteredEmployees();
  byId("employee-empty").hidden = employees.length !== 0;
  byId("employee-table").hidden = employees.length === 0;
  byId("employee-rows").replaceChildren(...employees.map(createRow));
}

// หน้าต่างฟอร์มลูกจ้าง (ใช้คอมโพเนนต์ร่วมกับสมาชิก แต่เปลี่ยน prefix เป็น "employee")
const formDialog = createPersonFormDialog({
  prefix: "employee",
  titles: {
    add: "เพิ่มลูกจ้างใหม่",
    view: "ข้อมูลลูกจ้าง",
    edit: "แก้ไขข้อมูลลูกจ้าง",
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
  },
  onSubmitSuccess: (saved) => {
    if (state.form.mode === "add") {
      state.employees = [saved, ...state.employees];
    } else {
      state.employees = state.employees.map((e) => (e.id === saved.id ? saved : e));
    }
    renderTable();
  },
  submitUrl: () => (state.form.mode === "add" ? "/api/employees" : `/api/employees/${state.form.entity.id}`),
  submitMethod: () => (state.form.mode === "add" ? "POST" : "PUT"),
  onClose: () => {
    state.form = { open: false, mode: "add", entity: null, loading: false };
  },
});

async function openViewForm(employee) {
  state.form = { open: true, mode: "view", entity: employee, loading: true };
  formDialog.open({ mode: "view", loading: true, data: null });
  try {
    const res = await fetch(`/api/employees/${employee.id}`);
    if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const full = await res.json();
    state.form = { open: true, mode: "view", entity: full, loading: false };
    formDialog.open({ mode: "view", loading: false, data: full });
  } catch (error) {
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    formDialog.close();
  }
}

async function openEditForm(employee) {
  state.form = { open: true, mode: "edit", entity: employee, loading: true };
  formDialog.open({ mode: "edit", loading: true, data: null });
  try {
    const res = await fetch(`/api/employees/${employee.id}`);
    if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const full = await res.json();
    state.form = { open: true, mode: "edit", entity: full, loading: false };
    formDialog.open({ mode: "edit", loading: false, data: full });
  } catch (error) {
    alert(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    formDialog.close();
  }
}

const statusDialog = createStatusDialog({
  entityName: "ลูกจ้าง",
  getName: (e) => `${e.employeeCode} ${e.firstName} ${e.lastName}`,
  url: (e) => `/api/employees/${e.id}/status`,
  onSuccess: (updated) => {
    state.employees = state.employees.map((e) => (e.id === updated.id ? updated : e));
    renderTable();
  },
});

const deleteDialog = createDeleteDialog({
  entityName: "ลูกจ้าง",
  getName: (e) => `${e.employeeCode} ${e.firstName} ${e.lastName}`,
  url: (e) => `/api/employees/${e.id}`,
  onSuccess: (deletedId) => {
    state.employees = state.employees.filter((e) => e.id !== deletedId);
    renderTable();
  },
});

byId("employee-search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderTable();
});

byId("add-employee-button").addEventListener("click", () => {
  state.form = { open: true, mode: "add", entity: null, loading: false };
  formDialog.open({ mode: "add", loading: false, data: null });
});

try {
  const data = await loadPageData("employees");
  state.employees = data.employees;
  renderTable();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

// =============================================================================
// public/js/pages/employees.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการลูกจ้าง" (pages/employees.html)
//
// ทำงานแบบเดียวกับหน้าสมาชิก แต่:
//   - ตารางมีแค่ รหัส / ชื่อ / สถานะ / ปุ่มจัดการ
//   - หน้าต่างดู/แก้ไขข้อมูล แสดงรายการสัญญาจ้างของลูกจ้างคนนั้นด้วย
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { initSidebar } from "../components/sidebar.js";
import { createPersonFormDialog } from "../components/person-form-dialog.js";
import { createDeleteDialog, createStatusDialog } from "../components/status-dialogs.js";

initSidebar();

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  employees: [], // รายชื่อลูกจ้างทั้งหมด
  contracts: [], // สัญญาจ้างทั้งหมด (ใช้แสดงในหน้าต่างข้อมูลลูกจ้าง)
  search: "",
  form: { open: false, mode: "add", entity: null, loading: false },
};

// -----------------------------------------------------------------------------
// ตารางลูกจ้าง
// -----------------------------------------------------------------------------

// ลูกจ้างที่ตรงกับคำค้นหา (เทียบกับ รหัส ชื่อ นามสกุล เบอร์โทร)
function filteredEmployees() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.employees;
  return state.employees.filter((e) =>
    [e.employeeCode, e.firstName, e.lastName, e.phone].join(" ").toLowerCase().includes(q)
  );
}

// สร้างแถวตาราง 1 แถว จาก template
function createRow(employee) {
  const row = cloneTemplate("employee-row-template");
  const isActive = employee.status === "Active";

  setSlot(row, "employeeCode", employee.employeeCode);
  setSlot(row, "fullName", `${employee.firstName} ${employee.lastName}`);
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

// วาดตารางใหม่ทั้งหมด
function renderTable() {
  const employees = filteredEmployees();
  byId("employee-empty").hidden = employees.length !== 0;
  byId("employee-table").hidden = employees.length === 0;
  byId("employee-rows").replaceChildren(...employees.map(createRow));
}

// -----------------------------------------------------------------------------
// รายการสัญญาจ้างในหน้าต่างข้อมูลลูกจ้าง (ไม่แสดงในโหมดเพิ่มใหม่)
// -----------------------------------------------------------------------------
function renderContracts(mode, employee) {
  const section = byId("employee-contracts");
  section.hidden = mode === "add";
  if (mode === "add") return;

  // สัญญาเฉพาะของลูกจ้างคนนี้
  const contracts = employee
    ? state.contracts.filter((c) => c.employee.id === employee.id)
    : [];

  byId("employee-contracts-empty").hidden = contracts.length !== 0;
  const list = byId("employee-contracts-list");
  list.hidden = contracts.length === 0;
  list.replaceChildren(
    ...contracts.map((contract) => {
      const item = cloneTemplate("employee-contract-template");
      // สัญญาที่มีวันสิ้นสุดและเลยวันนั้นมาแล้ว = สิ้นสุดสัญญาแล้ว
      const isExpired =
        contract.contractEndDate !== null &&
        new Date(contract.contractEndDate) <= new Date();
      setSlot(item, "memberName", `${contract.member.firstName} ${contract.member.lastName}`);
      setSlot(item, "memberCode", contract.member.code);
      setSlot(item, "memberShare", String(contract.memberShare));
      setSlot(item, "employeeShare", String(contract.employeeShare));
      item.querySelector('[data-slot="badge-expired"]').hidden = !isExpired;
      item.querySelector('[data-slot="badge-active"]').hidden =
        isExpired || contract.status !== "Active";
      item.querySelector('[data-slot="badge-inactive"]').hidden =
        isExpired || contract.status === "Active";
      return item;
    })
  );
}

// -----------------------------------------------------------------------------
// หน้าต่างฟอร์มลูกจ้าง
// -----------------------------------------------------------------------------
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
  fromEntity: (employee) => ({
    firstName: employee.firstName,
    lastName: employee.lastName,
    idCardNumber: employee.idCardNumber,
    dateOfBirth: employee.dateOfBirth.slice(0, 10),
    phone: employee.phone,
    address: employee.address,
    district: employee.district,
    province: employee.province,
    postalCode: employee.postalCode,
    photoUrl: employee.photoUrl,
  }),
  onSubmit: handleFormSubmit,
  onClose: () => updateForm({ open: false }),
  onRequestEdit: () => updateForm({ mode: "edit" }),
  renderExtra: renderContracts,
});

function updateForm(changes) {
  Object.assign(state.form, changes);
  formDialog.sync(state.form);
}

function openAddForm() {
  updateForm({ entity: null, mode: "add", open: true });
}

// ตารางไม่มีรูปถ่าย จึงต้องดึงข้อมูลเต็มเมื่อเปิดดู/แก้ไข
async function fetchFullEmployee(id) {
  const res = await fetch(`/api/employees/${id}`);
  if (!res.ok) {
    throw new Error("ไม่สามารถโหลดข้อมูลลูกจ้างได้");
  }
  return res.json();
}

async function openFormWithFullEmployee(employee, mode) {
  updateForm({ entity: null, mode, loading: true, open: true });
  try {
    const full = await fetchFullEmployee(employee.id);
    updateForm({ entity: full, loading: false });
  } catch {
    alert("ไม่สามารถโหลดข้อมูลลูกจ้างได้ กรุณาลองใหม่อีกครั้ง");
    updateForm({ open: false, loading: false });
  }
}

function openViewForm(employee) {
  openFormWithFullEmployee(employee, "view");
}

function openEditForm(employee) {
  openFormWithFullEmployee(employee, "edit");
}

// บันทึกฟอร์ม: เพิ่ม → POST, แก้ไข → PATCH
async function handleFormSubmit(input) {
  if (state.form.mode === "add") {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถเพิ่มลูกจ้างได้");
    }
    state.employees = [...state.employees, data];
  } else if (state.form.mode === "edit" && state.form.entity) {
    const res = await fetch(`/api/employees/${state.form.entity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
    }
    state.employees = state.employees.map((emp) => (emp.id === data.id ? data : emp));
  }
  renderTable();
}

// -----------------------------------------------------------------------------
// หน้าต่างระงับ/เปิดใช้งาน และหน้าต่างลบ
// -----------------------------------------------------------------------------
function fillEmployeeText(overlay, employee) {
  setSlot(overlay, "name", `${employee.firstName} ${employee.lastName}`);
  setSlot(overlay, "code", employee.employeeCode);
}

const statusDialog = createStatusDialog(byId("employee-status-modal"), {
  titles: { suspend: "ระงับลูกจ้าง", activate: "เปิดใช้งานลูกจ้าง" },
  fill: fillEmployeeText,
  onConfirm: async (employee) => {
    const nextStatus = employee.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    state.employees = state.employees.map((emp) => (emp.id === data.id ? data : emp));
    renderTable();
  },
});

const deleteDialog = createDeleteDialog(byId("employee-delete-modal"), {
  fill: fillEmployeeText,
  errorFallback: "ไม่สามารถลบลูกจ้างได้",
  onConfirm: async (employee) => {
    const res = await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบลูกจ้างได้");
    }
    state.employees = state.employees.filter((emp) => emp.id !== employee.id);
    renderTable();
  },
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
byId("add-employee-button").addEventListener("click", openAddForm);

byId("employee-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTable();
});

try {
  const data = await loadPageData("employees");
  state.employees = data.initialEmployees;
  state.contracts = data.contracts;
  renderTable();
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false;
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

// =============================================================================
// public/js/pages/users.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ตรวจสอบสิทธิ์ผู้ใช้งาน" (pages/users.html) — เฉพาะผู้ดูแลระบบ
//
//   - แสดง/ค้นหาบัญชีผู้ใช้งาน (ค้นจาก ชื่อ นามสกุล ชื่อผู้ใช้งาน อีเมล)
//   - เพิ่ม / ดู / แก้ไข บัญชี (ถ้าไม่กรอกรหัสผ่านตอนเพิ่ม ระบบใช้วันเกิดเป็นรหัสเริ่มต้น)
//   - ระงับ / เปิดใช้งาน / ลบ บัญชี
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { initSidebar } from "../components/sidebar.js";
import { createModal } from "../components/modal.js";
import { createDeleteDialog, createStatusDialog } from "../components/status-dialogs.js";

initSidebar();

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  users: [],
  search: "",
  form: { open: false, mode: "add", entity: null },
};

// -----------------------------------------------------------------------------
// ตารางผู้ใช้งาน
// -----------------------------------------------------------------------------
function filteredUsers() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.users;
  return state.users.filter((u) =>
    [u.firstName, u.lastName, u.username, u.email].join(" ").toLowerCase().includes(q)
  );
}

function createRow(user) {
  const row = cloneTemplate("user-row-template");
  const isActive = user.status === "Active";

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

// -----------------------------------------------------------------------------
// หน้าต่างฟอร์มผู้ใช้งาน
// -----------------------------------------------------------------------------
const TITLES = {
  add: "เพิ่มผู้ใช้งานใหม่",
  view: "ข้อมูลผู้ใช้งาน",
  edit: "แก้ไขข้อมูลผู้ใช้งาน",
};

// ช่องกรอก: ชื่อฟิลด์ในข้อมูล → id ของช่องใน HTML
const FIELD_IDS = {
  firstName: "user-first-name",
  lastName: "user-last-name",
  phone: "user-phone",
  email: "user-email",
  username: "user-username",
  dateOfBirth: "user-dob",
  role: "user-role",
  password: "user-password",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  username: "",
  dateOfBirth: "",
  role: "STAFF",
  password: "",
};

const formOverlay = byId("user-form-modal");
const formModal = createModal(formOverlay, { onClose: () => updateForm({ open: false }) });
const formElement = byId("user-form");
const formErrorElement = byId("user-form-error");
const submitButton = byId("user-form-submit");

// สถานะภายในของฟอร์ม
let formKey = null;
let formValues = { ...EMPTY_FORM };
let formSubmitting = false;
let formError = null;

// ตั้งค่าฟอร์มใหม่จากผู้ใช้ที่เลือก (หรือฟอร์มว่างถ้าเพิ่มใหม่)
function mountForm() {
  const user = state.form.entity;
  formValues = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        username: user.username,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
        role: user.role,
        password: "",
      }
    : { ...EMPTY_FORM };
  formSubmitting = false;
  formError = null;
  for (const [name, id] of Object.entries(FIELD_IDS)) byId(id).value = formValues[name];
}

// วาดส่วนที่ขึ้นกับโหมด
function renderForm() {
  const { mode } = state.form;
  const readOnly = mode === "view";
  formModal.setTitle(TITLES[mode]);

  for (const id of Object.values(FIELD_IDS)) byId(id).disabled = readOnly;

  // ช่องรหัสผ่านแสดงเฉพาะโหมดเพิ่ม/แก้ไข
  byId("user-password-section").hidden = readOnly;
  byId("user-password-label").textContent =
    mode === "add"
      ? "รหัสผ่าน (เว้นว่างไว้เพื่อใช้วันเกิดเป็นรหัสผ่านเริ่มต้น)"
      : "รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)";
  byId("user-password-hint").hidden = mode !== "add";

  byId("user-form-close").hidden = !readOnly;
  byId("user-form-edit").hidden = !readOnly;
  byId("user-form-cancel").hidden = readOnly;
  submitButton.hidden = readOnly;
  submitButton.disabled = formSubmitting;
  submitButton.textContent = formSubmitting ? "กำลังบันทึก..." : "บันทึก";

  formErrorElement.textContent = formError ?? "";
  formErrorElement.hidden = !formError;
}

// เปลี่ยนค่าของฟอร์ม (โหมด/ผู้ใช้/เปิด-ปิด) — ถ้าเปลี่ยน ฟอร์มจะถูกตั้งค่าใหม่
function updateForm(changes) {
  const wasOpen = formModal.isOpen;
  Object.assign(state.form, changes);
  const { mode, entity, open } = state.form;
  const key = `${mode}-${entity?.id ?? "new"}-${open}`;
  const remounted = key !== formKey;
  if (remounted) {
    formKey = key;
    mountForm();
  }
  renderForm();
  if (open) {
    formModal.open();
    if (remounted && wasOpen) formModal.replayAnimation();
  } else {
    formModal.close();
  }
}

// เก็บค่าที่ผู้ใช้พิมพ์ (เบอร์โทรรับเฉพาะตัวเลข)
for (const [name, id] of Object.entries(FIELD_IDS)) {
  const input = byId(id);
  const eventName = input.tagName === "SELECT" ? "change" : "input";
  input.addEventListener(eventName, () => {
    if (name === "phone") {
      const digits = input.value.replace(/\D/g, "");
      if (digits !== input.value) input.value = digits;
    }
    formValues[name] = input.value;
  });
}

// บันทึกฟอร์ม
formElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.form.mode === "view") return;
  formSubmitting = true;
  formError = null;
  renderForm();
  try {
    await handleFormSubmit({ ...formValues });
    updateForm({ open: false });
  } catch (err) {
    formError = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
  } finally {
    formSubmitting = false;
    renderForm();
  }
});

byId("user-form-close").addEventListener("click", () => updateForm({ open: false }));
byId("user-form-cancel").addEventListener("click", () => updateForm({ open: false }));
byId("user-form-edit").addEventListener("click", () => updateForm({ mode: "edit" }));

// ส่งข้อมูล: เพิ่ม → POST, แก้ไข → PATCH
async function handleFormSubmit(input) {
  if (state.form.mode === "add") {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถเพิ่มผู้ใช้งานได้");
    }
    state.users = [...state.users, data];
  } else if (state.form.mode === "edit" && state.form.entity) {
    const res = await fetch(`/api/users/${state.form.entity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
    }
    state.users = state.users.map((u) => (u.id === data.id ? data : u));
  }
  renderTable();
}

// -----------------------------------------------------------------------------
// หน้าต่างระงับ/เปิดใช้งาน และหน้าต่างลบ (แสดงชื่อ + ชื่อผู้ใช้งาน)
// -----------------------------------------------------------------------------
function fillUserText(overlay, user) {
  setSlot(overlay, "name", `${user.firstName} ${user.lastName}`);
  setSlot(overlay, "code", user.username);
}

const statusDialog = createStatusDialog(byId("user-status-modal"), {
  titles: { suspend: "ระงับผู้ใช้งาน", activate: "เปิดใช้งานผู้ใช้งาน" },
  fill: fillUserText,
  onConfirm: async (user) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    state.users = state.users.map((u) => (u.id === data.id ? data : u));
    renderTable();
  },
});

const deleteDialog = createDeleteDialog(byId("user-delete-modal"), {
  fill: fillUserText,
  errorFallback: "ไม่สามารถลบผู้ใช้งานได้",
  onConfirm: async (user) => {
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบผู้ใช้งานได้");
    }
    state.users = state.users.filter((u) => u.id !== user.id);
    renderTable();
  },
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
byId("add-user-button").addEventListener("click", () =>
  updateForm({ entity: null, mode: "add", open: true })
);

byId("user-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTable();
});

try {
  const data = await loadPageData("users");
  state.users = data.initialUsers;
  renderTable();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

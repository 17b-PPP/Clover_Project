// =============================================================================
// public/js/pages/contracts.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "การจัดการสัญญาจ้าง" (pages/contracts.html)
//
//   - ตารางสัญญา: ค้นหาได้ และเลือกแสดง/ซ่อนสัญญาที่สิ้นสุดแล้ว
//   - เพิ่มสัญญา: เลือกเจ้าของสวน + ลูกจ้าง และกรอก % ของลูกจ้าง
//     (% ของเจ้าของสวน = 100 − % ลูกจ้าง คำนวณให้อัตโนมัติ)
//   - ดูข้อมูล / แก้ไขสัดส่วน / ระงับ-เปิดใช้งาน / ลบ / ดูประวัติสัดส่วน
//   - สัญญาที่สิ้นสุดแล้ว ทำได้แค่ดูข้อมูลและดูประวัติ
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { formatDate } from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { createModal } from "../components/modal.js";
import { createCombobox } from "../components/combobox.js";
import { createDeleteDialog, createStatusDialog } from "../components/status-dialogs.js";

initSidebar();

// -----------------------------------------------------------------------------
// สถานะของหน้า
// -----------------------------------------------------------------------------
const state = {
  contracts: [],
  members: [], // ตัวเลือกสมาชิก { id, memberCode, firstName, lastName, status }
  employees: [], // ตัวเลือกลูกจ้าง { id, employeeCode, firstName, lastName, status }
  search: "",
  showExpired: false,
  form: { open: false, mode: "add", entity: null },
};

// ข้อความชื่อ-นามสกุลของคู่สัญญา
const memberName = (c) => `${c.member.firstName} ${c.member.lastName}`;
const employeeName = (c) => `${c.employee.firstName} ${c.employee.lastName}`;

// สัญญาที่มีวันสิ้นสุดและเลยวันนั้นมาแล้ว
function isExpired(contract) {
  return (
    contract.contractEndDate !== null && new Date(contract.contractEndDate) <= new Date()
  );
}

// -----------------------------------------------------------------------------
// ตารางสัญญาจ้าง
// -----------------------------------------------------------------------------

// กรอง: (1) ซ่อนสัญญาที่มีวันสิ้นสุดถ้าไม่ได้ติ๊ก (2) ค้นหาจากรหัส/ชื่อ/รหัสคู่สัญญา
function filteredContracts() {
  const q = state.search.trim().toLowerCase();
  return state.contracts
    .filter((c) => state.showExpired || c.contractEndDate === null)
    .filter((c) => {
      if (!q) return true;
      return [
        c.pairCode,
        c.member.firstName,
        c.member.lastName,
        c.member.code,
        c.employee.firstName,
        c.employee.lastName,
        c.employee.code,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
}

function createRow(contract) {
  const row = cloneTemplate("contract-row-template");
  const expired = isExpired(contract);
  const isActive = contract.status === "Active";

  setSlot(row, "pairCode", contract.pairCode);
  setSlot(row, "memberName", memberName(contract));
  setSlot(row, "employeeName", employeeName(contract));
  setSlot(row, "shares", `${contract.memberShare}% / ${contract.employeeShare}%`);

  // ป้ายสถานะ: สิ้นสุดสัญญาแล้ว > ใช้งานอยู่ > ถูกระงับ
  row.querySelector('[data-slot="badge-expired"]').hidden = !expired;
  row.querySelector('[data-slot="badge-active"]').hidden = expired || !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = expired || isActive;

  // สัญญาที่สิ้นสุดแล้ว ซ่อนปุ่มแก้ไข/ระงับ/ลบ
  const editButton = action(row, "edit");
  const toggleButton = action(row, "toggle-status");
  const deleteButton = action(row, "delete");
  editButton.hidden = expired;
  toggleButton.hidden = expired;
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";
  deleteButton.hidden = expired || contract.status !== "Inactive";

  action(row, "view").addEventListener("click", () =>
    updateForm({ entity: contract, mode: "view", open: true })
  );
  action(row, "history").addEventListener("click", () => openHistory(contract));
  editButton.addEventListener("click", () =>
    updateForm({ entity: contract, mode: "edit", open: true })
  );
  toggleButton.addEventListener("click", () => statusDialog.open(contract));
  deleteButton.addEventListener("click", () => deleteDialog.open(contract));
  return row;
}

function renderTable() {
  const contracts = filteredContracts();
  byId("contract-empty").hidden = contracts.length !== 0;
  byId("contract-table").hidden = contracts.length === 0;
  byId("contract-rows").replaceChildren(...contracts.map(createRow));
}

// -----------------------------------------------------------------------------
// หน้าต่างสัญญาจ้าง (เพิ่ม / ดู / แก้ไขสัดส่วน)
// -----------------------------------------------------------------------------
const TITLES = {
  add: "เพิ่มสัญญาจ้างใหม่",
  view: "ข้อมูลสัญญาจ้าง",
  edit: "แก้ไขสัดส่วนรายได้",
};

const formOverlay = byId("contract-form-modal");
const formModal = createModal(formOverlay, { onClose: () => updateForm({ open: false }) });
const formElement = byId("contract-form");
const viewElement = byId("contract-view");
const employeeShareInput = byId("contract-employee-share");
const memberShareInput = byId("contract-member-share");
const submitButton = byId("contract-form-submit");
const formErrorElement = byId("contract-form-error");

// สถานะภายในของฟอร์ม
let formKey = null;
let memberId = "";
let employeeId = "";
let employeeShare = 50;
let formSubmitting = false;
let formError = null;

// สัดส่วนเจ้าของสวน = 100 − สัดส่วนลูกจ้าง (ปัดทศนิยม 2 ตำแหน่ง)
const memberShare = () => Math.round((100 - employeeShare) * 100) / 100;

// ช่องเลือกเจ้าของสวน / ลูกจ้าง
const memberCombobox = createCombobox(byId("contract-member-field"), {
  onChange: (value) => {
    memberId = value;
  },
});
const employeeCombobox = createCombobox(byId("contract-employee-field"), {
  onChange: (value) => {
    employeeId = value;
  },
});

// ตั้งค่าฟอร์มใหม่จากสัญญาที่เลือก (หรือค่าเริ่มต้นถ้าเพิ่มใหม่)
function mountForm() {
  const contract = state.form.entity;
  memberId = contract?.member.id ?? "";
  employeeId = contract?.employee.id ?? "";
  employeeShare = contract?.employeeShare ?? 50;
  formSubmitting = false;
  formError = null;

  // ตัวเลือก = สมาชิก/ลูกจ้างที่ใช้งานอยู่ (รวมคนที่ถูกเลือกไว้แล้วด้วย)
  memberCombobox.setOptions(
    state.members
      .filter((m) => m.status === "Active" || m.id === memberId)
      .map((m) => ({ value: m.id, label: `${m.memberCode} — ${m.firstName} ${m.lastName}` }))
  );
  employeeCombobox.setOptions(
    state.employees
      .filter((e) => e.status === "Active" || e.id === employeeId)
      .map((e) => ({ value: e.id, label: `${e.employeeCode} — ${e.firstName} ${e.lastName}` }))
  );
  memberCombobox.reset(memberId);
  employeeCombobox.reset(employeeId);

  employeeShareInput.value = String(employeeShare);
  memberShareInput.value = String(memberShare());

  // ข้อความในโหมดดูข้อมูล / กล่องคู่สัญญาในโหมดแก้ไข
  if (contract) {
    setSlot(viewElement, "pairCode", contract.pairCode);
    setSlot(viewElement, "memberText", `${memberName(contract)} (${contract.member.code})`);
    setSlot(viewElement, "employeeText", `${employeeName(contract)} (${contract.employee.code})`);
    setSlot(
      viewElement,
      "sharesText",
      `เจ้าของสวน ${contract.memberShare}% / ลูกจ้าง ${contract.employeeShare}%`
    );
    const parties = byId("contract-parties");
    setSlot(
      parties,
      "partiesText",
      `${memberName(contract)} (${contract.member.code}) ↔ ${employeeName(contract)} (${contract.employee.code})`
    );
    setSlot(
      parties,
      "currentSharesText",
      `สัดส่วนปัจจุบัน: เจ้าของสวน ${contract.memberShare}% / ลูกจ้าง ${contract.employeeShare}%`
    );
  }
}

// วาดส่วนที่ขึ้นกับโหมด
function renderForm() {
  const { mode, entity } = state.form;
  const readOnly = mode === "view";
  const isEdit = mode === "edit";
  formModal.setTitle(TITLES[mode]);

  // โหมดดูข้อมูลแสดงรายละเอียด, โหมดอื่นแสดงฟอร์ม
  viewElement.hidden = !(readOnly && entity);
  formElement.hidden = readOnly && Boolean(entity);
  byId("contract-parties").hidden = !(isEdit && entity);
  byId("contract-member-field").hidden = isEdit && Boolean(entity);
  byId("contract-employee-field").hidden = isEdit && Boolean(entity);

  byId("contract-form-close").hidden = !readOnly;
  byId("contract-form-edit").hidden = !readOnly;
  byId("contract-form-cancel").hidden = readOnly;
  submitButton.hidden = readOnly;
  submitButton.disabled = formSubmitting;
  submitButton.textContent = formSubmitting
    ? "กำลังบันทึก..."
    : isEdit
      ? "บันทึกสัดส่วนใหม่"
      : "บันทึก";

  formErrorElement.textContent = formError ?? "";
  formErrorElement.hidden = !formError;
}

// เปลี่ยนค่าของหน้าต่าง (ถ้าโหมด/สัญญา/การเปิดปิดเปลี่ยน ฟอร์มจะถูกตั้งค่าใหม่)
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

// พิมพ์ % ลูกจ้าง → คำนวณ % เจ้าของสวนใหม่
// (ช่องตัวเลขที่ถูกลบจนว่างจะกลายเป็น 0 ทันที เหมือนพฤติกรรมของฟอร์มเดิม)
employeeShareInput.addEventListener("input", () => {
  const next = Number(employeeShareInput.value);
  if (next === employeeShare) return;
  employeeShare = next;
  if ((next === 0 && employeeShareInput.value === "") || employeeShareInput.value != next) {
    employeeShareInput.value = String(next);
  }
  memberShareInput.value = String(memberShare());
});

// บันทึก
formElement.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.form.mode === "view") return;
  formSubmitting = true;
  formError = null;
  renderForm();
  try {
    await handleFormSubmit({
      memberId,
      employeeId,
      memberShare: memberShare(),
      employeeShare,
    });
    updateForm({ open: false });
  } catch (err) {
    formError = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
  } finally {
    formSubmitting = false;
    renderForm();
  }
});

byId("contract-form-close").addEventListener("click", () => updateForm({ open: false }));
byId("contract-form-cancel").addEventListener("click", () => updateForm({ open: false }));
byId("contract-form-edit").addEventListener("click", () => updateForm({ mode: "edit" }));

// ส่งข้อมูล: เพิ่ม → POST, แก้ไข → PATCH เฉพาะสัดส่วน
async function handleFormSubmit(input) {
  if (state.form.mode === "add") {
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถเพิ่มสัญญาจ้างได้");
    }
    state.contracts = [...state.contracts, data];
  } else if (state.form.mode === "edit" && state.form.entity) {
    const res = await fetch(`/api/contracts/${state.form.entity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberShare: input.memberShare,
        employeeShare: input.employeeShare,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
    }
    state.contracts = state.contracts.map((c) => (c.id === data.id ? data : c));
  }
  renderTable();
}

// -----------------------------------------------------------------------------
// หน้าต่างระงับ/เปิดใช้งาน และหน้าต่างลบ
// -----------------------------------------------------------------------------
function fillContractText(overlay, contract) {
  setSlot(overlay, "pairCode", contract.pairCode);
  setSlot(overlay, "memberName", memberName(contract));
  setSlot(overlay, "employeeName", employeeName(contract));
}

const statusDialog = createStatusDialog(byId("contract-status-modal"), {
  titles: { suspend: "ระงับสัญญาจ้าง", activate: "เปิดใช้งานสัญญาจ้าง" },
  fill: fillContractText,
  onConfirm: async (contract) => {
    const nextStatus = contract.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    state.contracts = state.contracts.map((c) => (c.id === data.id ? data : c));
    renderTable();
  },
});

const deleteDialog = createDeleteDialog(byId("contract-delete-modal"), {
  fill: fillContractText,
  errorFallback: "ไม่สามารถลบสัญญาจ้างได้",
  onConfirm: async (contract) => {
    const res = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสัญญาจ้างได้");
    }
    state.contracts = state.contracts.filter((c) => c.id !== contract.id);
    renderTable();
  },
});

// -----------------------------------------------------------------------------
// หน้าต่างประวัติสัดส่วนสัญญา
// -----------------------------------------------------------------------------
const historyModal = createModal(byId("contract-history-modal"), {
  onClose: () => historyModal.close(),
});
let historyContractId = null;
let historyRequest = 0;

// แสดงรายการประวัติ
function renderHistory(history) {
  byId("history-loading").hidden = true;
  const list = byId("history-list");
  list.hidden = false;
  list.replaceChildren(
    ...history.map((entry) => {
      const item = cloneTemplate("history-item-template");
      const isCurrent = entry.contractEndDate === null;
      setSlot(item, "memberShare", String(entry.memberShare));
      setSlot(item, "employeeShare", String(entry.employeeShare));
      item.querySelector('[data-slot="badge-current"]').hidden = !isCurrent;
      item.querySelector('[data-slot="badge-ended"]').hidden = isCurrent;
      setSlot(
        item,
        "dates",
        `${formatDate(entry.contractStartDate)} – ${
          entry.contractEndDate ? formatDate(entry.contractEndDate) : "ปัจจุบัน"
        }`
      );
      return item;
    })
  );
}

// เปิดหน้าต่างประวัติ แล้วโหลดประวัติของคู่สมาชิก–ลูกจ้างนี้
// (ถ้าเป็นสัญญาเดิมกับครั้งก่อน จะแสดงประวัติเดิมไว้ระหว่างโหลดใหม่)
function openHistory(contract) {
  if (contract.id !== historyContractId) {
    historyContractId = contract.id;
    byId("history-loading").hidden = false;
    byId("history-list").hidden = true;
    byId("history-list").replaceChildren();
  }
  byId("history-parties").textContent = `${memberName(contract)} (${contract.member.code}) ↔ ${employeeName(contract)} (${contract.employee.code})`;
  historyModal.open();

  const requestId = ++historyRequest;
  fetch(
    `/api/contracts/history?memberId=${contract.member.id}&employeeId=${contract.employee.id}`
  )
    .then((res) => res.json())
    .then((data) => {
      if (requestId === historyRequest && historyContractId === contract.id) {
        renderHistory(data);
      }
    });
}

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
byId("add-contract-button").addEventListener("click", () =>
  updateForm({ entity: null, mode: "add", open: true })
);

byId("contract-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTable();
});

byId("show-expired").addEventListener("change", (event) => {
  state.showExpired = event.target.checked;
  renderTable();
});

try {
  const data = await loadPageData("contracts");
  state.contracts = data.initialContracts;
  state.members = data.members;
  state.employees = data.employees;
  renderTable();
  byId("page-loading").hidden = true;
  byId("page-content").hidden = false;
} catch (error) {
  byId("page-loading").hidden = true;
  showPageLoadError(byId("page-content"), error);
}

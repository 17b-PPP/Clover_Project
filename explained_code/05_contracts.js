// =============================================================================
// ไฟล์: explained_code/05_สัญญาจ้างจับคู่_contracts.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการสัญญาจ้าง" (Member-Employee Pair Contracts)
// ไฟล์ HTML ที่คู่กัน: pages/contracts.html
// เส้นทาง URL: /contracts
// ตารางฐานข้อมูลหลัก: MePair
// ความสำคัญทางธุรกิจ:
//   ผูกความสัมพันธ์ว่าลูกจ้างคนใดเป็นผู้ส่งน้ำยางแทนเจ้าของสวนรายใด
//   พร้อมกำหนดสัดส่วนแบ่งรายได้ เช่น สมาชิก 60% : ลูกจ้าง 40% (รวมกันต้องได้ 100%)
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { formatDate } from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createModal } from "../public/js/components/modal.js";
import { createCombobox } from "../public/js/components/combobox.js";
import { createDeleteDialog, createStatusDialog } from "../public/js/components/status-dialogs.js";

initSidebar();

// สถานะของหน้า
const state = {
  contracts: [],    // รายการสัญญาทั้งหมดจากตาราง MePair
  members: [],      // รายชื่อสมาชิกสำหรับแสดงในตัวเลือก (Combobox)
  employees: [],    // รายชื่อลูกจ้างสำหรับแสดงในตัวเลือก (Combobox)
  search: "",       // คำค้นหา
  form: { open: false, mode: "add", entity: null },
};

// ฟังก์ชันสร้างข้อความชื่อ-นามสกุล
const memberName = (c) => `${c.member.firstName} ${c.member.lastName}`;
const employeeName = (c) => `${c.employee.firstName} ${c.employee.lastName}`;

/**
 * ฟังก์ชัน: filteredContracts
 * หน้าที่: กรองสัญญาตามเงื่อนไข (1) แสดงเฉพาะสัญญาปัจจุบัน (2) กรองตามคำค้นหา
 */
function filteredContracts() {
  const q = state.search.trim().toLowerCase();
  return state.contracts
    .filter((c) => c.contractEndDate === null)
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

/**
 * สร้างแถวตารางสัญญา 1 แถว
 */
function createRow(contract) {
  const row = cloneTemplate("contract-row-template");
  const isActive = contract.status === "Active";

  setSlot(row, "pairCode", contract.pairCode);
  setSlot(row, "memberName", memberName(contract));
  setSlot(row, "employeeName", employeeName(contract));
  // แสดงสัดส่วนรายได้ เช่น 60% / 40%
  setSlot(row, "shares", `${contract.memberShare}% / ${contract.employeeShare}%`);

  // จัดการป้ายสถานะ (Badges)
  row.querySelector('[data-slot="badge-active"]').hidden = !isActive;
  row.querySelector('[data-slot="badge-inactive"]').hidden = isActive;

  const editButton = action(row, "edit");
  const toggleButton = action(row, "toggle-status");
  const deleteButton = action(row, "delete");
  toggleButton.classList.add(isActive ? "btn-danger" : "btn-secondary");
  toggleButton.textContent = isActive ? "ระงับ" : "เปิดใช้งาน";
  deleteButton.hidden = contract.status !== "Inactive";

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
// [จุดสำคัญ] การคำนวณสัดส่วนรายได้แบบอัตโนมัติ (Auto Share Balancing)
// เมื่อผู้ใช้กรอกเปอร์เซ็นต์ของลูกจ้าง เปอร์เซ็นต์ของสมาชิกจะคำนวณให้ทันที (100 - employeeShare)
// -----------------------------------------------------------------------------
const employeeShareInput = byId("employee-share");
const memberShareInput = byId("member-share");

employeeShareInput.addEventListener("input", () => {
  const empVal = Number(employeeShareInput.value);
  if (!isNaN(empVal) && empVal >= 0 && empVal <= 100) {
    memberShareInput.value = (100 - empVal).toFixed(2);
  }
});

// โหลดข้อมูลเริ่มต้นของหน้าสัญญา
try {
  const data = await loadPageData("contracts");
  state.contracts = data.contracts;
  state.members = data.members;
  state.employees = data.employees;
  renderTable();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

// =============================================================================
// ไฟล์: explained_code/13_พอร์ทัลสมาชิก_dashboard.js
// หน้าที่: ควบคุมการทำงานของหน้า "ภาพรวมสมาชิก" (Member Portal Dashboard)
// ไฟล์ HTML ที่คู่กัน: pages/member-dashboard.html
// เส้นทาง URL: /member/dashboard
// ความสำคัญทางธุรกิจ:
//   เป็นหน้าแรกที่สมาชิกชาวสวนยางเห็นหลังล็อกอิน
//   แสดงยอดกระเป๋าเงินสะสม, รายชื่อลูกจ้างที่ผูกสัญญา, สรุปยอดขาย และเงินปันผล
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../public/js/core/page-data.js";
import { DEFAULT_DATE_FROM, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../public/js/components/member-sidebar.js";
import { renderMemberTopbar } from "../public/js/components/member-topbar.js";

initMemberSidebar();

const state = {
  entries: [],         // ประวัติการเงินทั้งหมดของสมาชิกคนนี้ (ขาย, เบิก, ปันผล)
  dividendBalance: 0,  // ยอดเงินปันผลสะสมรวม
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: todayBangkok(),
  selectedYear: null,
};

/**
 * แสดงรายการลูกจ้างที่มีสัญญาจ้างผูกกับสมาชิกคนนี้
 */
function renderEmployees(employees) {
  byId("employee-empty").hidden = employees.length !== 0;
  const list = byId("employee-list");
  list.hidden = employees.length === 0;
  list.replaceChildren(
    ...employees.map((employee) => {
      const item = cloneTemplate("employee-item-template");
      setSlot(item, "name", `${employee.firstName} ${employee.lastName}`);
      setSlot(item, "code", employee.employeeCode);
      setSlot(item, "phone", employee.phone);
      // แสดงสัดส่วนส่วนแบ่ง เช่น สมาชิก 60% / ลูกจ้าง 40%
      setSlot(item, "shares", `${employee.memberShare}% / ${employee.employeeShare}%`);
      return item;
    })
  );
}

/**
 * คำนวณสรุปตัวเลขภาพรวมการขายน้ำยางของสมาชิกตามช่วงวันที่
 */
function computeTotals(entries) {
  let rawWeightKg = 0;
  let dryWeightKg = 0;
  let totalAmount = 0;
  let myAmount = 0;         // ยอดเงินที่เข้ากระเป๋าของสมาชิกเอง (หักส่วนแบ่งลูกจ้างแล้ว)
  let withdrawnAmount = 0;  // ยอดที่เบิกออกไปแล้ว
  let saleCount = 0;
  const salesByEmployee = new Map();

  for (const entry of entries) {
    if (entry.type === "PURCHASE") {
      saleCount += 1;
      rawWeightKg += entry.rawWeightKg ?? 0;
      dryWeightKg += ((entry.rawWeightKg ?? 0) * (entry.dryPercentage ?? 0)) / 100;
      totalAmount += entry.totalAmount ?? 0;
      myAmount += entry.amount; // entry.amount คือยอด ownerPayout ของสมาชิก
      if (entry.deliveredByName && entry.employeePayout) {
        salesByEmployee.set(
          entry.deliveredByName,
          (salesByEmployee.get(entry.deliveredByName) ?? 0) + entry.employeePayout
        );
      }
    } else if (entry.type === "WITHDRAWAL") {
      withdrawnAmount += Math.abs(entry.amount);
    }
  }

  return { rawWeightKg, dryWeightKg, totalAmount, myAmount, withdrawnAmount, saleCount };
}

// โหลดข้อมูลพอร์ทัลสมาชิก
try {
  const data = await loadMemberPortalData("dashboard");
  renderMemberTopbar(data.profile); // แสดงชื่อ-นามสกุลสมาชิกบน Topbar
  state.entries = data.entries ?? [];
  state.dividendBalance = data.dividendBalance ?? 0;
  renderEmployees(data.employees ?? []);
  renderOverview();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

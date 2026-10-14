// =============================================================================
// ไฟล์: explained_code/14_พอร์ทัลสมาชิก_การเงิน_finance.js
// หน้าที่: ควบคุมการทำงานของหน้า "ประวัติทางการเงิน" ของสมาชิก (Member Financial Statement)
// ไฟล์ HTML ที่คู่กัน: pages/member-finance.html
// เส้นทาง URL: /member/finance
// ความสำคัญทางธุรกิจ:
//   แสดงสมุดบัญชี Statement การเงินของสมาชิก ประกอบด้วยรายการ 3 ประเภท:
//   1. ขายน้ำยาง (PURCHASE) - เงินเข้ากระเป๋า
//   2. เบิกเงิน (WITHDRAWAL) - เงินออกจากกระเป๋า
//   3. เงินปันผล (DIVIDEND) - เงินโบนัสประจำปี
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadMemberPortalData, showPageLoadError } from "../public/js/core/page-data.js";
import { DEFAULT_DATE_FROM, formatDateUtc, formatNumber, todayBangkok } from "/shared/format.js";
import { initMemberSidebar } from "../public/js/components/member-sidebar.js";
import { renderMemberTopbar } from "../public/js/components/member-topbar.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";
import { createMonthlyBarChart } from "../public/js/charts/monthly-bar-chart.js";

initMemberSidebar();

const PAGE_SIZE = 10;
const dateFromInput = byId("date-from");
const dateToInput = byId("date-to");

const state = {
  entries: [],                 // ธุรกรรมการเงินทั้งหมด
  typeFilter: "ALL",           // ตัวกรองประเภท: ALL / PURCHASE / WITHDRAWAL / DIVIDEND
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: todayBangkok(),
  page: 1,
};

// กราฟแท่งแสดงรายได้จากการขายน้ำยางในแต่ละเดือน (React + Recharts)
const incomeChart = createMonthlyBarChart(byId("income-chart-empty"), byId("income-chart"), {
  valueKey: "income",
  yAxisLabel: "รายได้จากการขาย (บาท)",
  unit: "บาท",
  seriesName: "รายได้จากการขายน้ำยาง",
});

/**
 * สร้างบรรทัดข้อความรายละเอียดของแต่ละแถว (เช่น แจ้งยอดหักลูกจ้าง หรืออัตราปันผล)
 */
function detailLines(entry) {
  if (entry.type === "PURCHASE") {
    const lines = [detailLine(`ขายน้ำยางสด ยอดรวม ${formatNumber(entry.totalAmount ?? 0)} บาท`)];
    if (entry.deliveredByName) {
      lines.push(
        detailLine(
          `แบ่งจ่ายให้ลูกจ้าง ${entry.deliveredByName} ${formatNumber(entry.employeePayout ?? 0)} บาท`,
          true
        )
      );
    }
    return lines;
  }
  if (entry.type === "DIVIDEND") {
    return [
      detailLine(`เงินปันผลประจำปี ${entry.buddhistYear}`),
      detailLine(`อัตรา ${formatNumber(entry.rate ?? 0)} บาท/กก.`),
    ];
  }
  return [
    detailLine(`เบิกเงิน ${formatNumber(Math.abs(entry.amount))} บาท`),
    detailLine(`คงเหลือหลังเบิก ${formatNumber(entry.balanceAfter ?? 0)} บาท`),
  ];
}

function detailLine(text, danger = false) {
  const line = cloneTemplate("detail-line-template");
  if (danger) line.className = "detail-line detail-line--danger";
  line.textContent = text;
  return line;
}

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadMemberPortalData("finance");
  renderMemberTopbar(data.profile);
  state.entries = data.entries ?? [];
  render();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

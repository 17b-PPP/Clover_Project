// =============================================================================
// ไฟล์: explained_code/09_คำนวณเงินปันผล_dividends.js
// หน้าที่: ควบคุมการทำงานของหน้า "การจัดการคำนวณเงินปันผล" (Annual Dividend Distribution)
// ไฟล์ HTML ที่คู่กัน: pages/dividends.html
// เส้นทาง URL: /dividends
// ตารางฐานข้อมูลหลัก: DividendPayment, Member (บวกเงินเข้า walletBalance และ dividendBalance)
// ความสำคัญทางธุรกิจ:
//   สหกรณ์จ่ายเงินปันผลประจำปีตามยอดน้ำหนักเนื้อยางแห้งสะสมของสมาชิก
//   มีระบบจำลองคำนวณก่อนจ่ายจริง และมีระบบป้องกันการจ่ายซ้ำในปีเดิม
// =============================================================================

import { action, byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { formatCurrency, formatDateTimeThai, formatNumber } from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { createModal } from "../public/js/components/modal.js";
import { createConfirmDialog } from "../public/js/components/confirm-dialog.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;
const DIVIDEND_PERIOD_LABEL = "พฤษภาคม - มีนาคม"; // รอบบัญชีของสหกรณ์

const yearSelect = byId("year-select"); // Dropdown เลือกปี พ.ศ.
const rateInput = byId("rate-input");   // ช่องกรอกอัตราเงินปันผล (บาท/กก.)
const page = byId("page-content");

const state = {
  data: null,              // { members, purchases, paidYears, payments } จากเซิร์ฟเวอร์
  year: null,              // ปี พ.ศ. ที่เลือก
  appliedPeriodLabel: "",  // ช่วงเวลาที่นำมาคำนวณ
  appliedRate: null,       // อัตราปันผลที่ใช้คำนวณ (null = ยังไม่ได้กดปุ่มตกลง)
  error: null,
  page: 1,
  paid: false,             // สถานะจ่ายสำเร็จแล้วในรอบนี้
  payError: null,
  selectedPayout: null,
};

/**
 * รวมยอดน้ำหนักเนื้อยางแห้งสะสมของสมาชิกแต่ละคนเฉพาะในปี พ.ศ. ที่เลือก
 */
function dryWeightByMember() {
  const map = new Map();
  for (const purchase of state.data.purchases) {
    if (purchase.buddhistYear !== state.year) continue;
    map.set(purchase.memberId, (map.get(purchase.memberId) ?? 0) + purchase.dryWeightKg);
  }
  return map;
}

/**
 * คำนวณเงินปันผลของสมาชิกแต่ละคน:
 * เงินปันผล = น้ำหนักยางแห้งสะสมทั้งปี × อัตราปันผล (บาท/กก.)
 */
function dividendRows(weights) {
  return state.data.members.map((member) => {
    const dryWeightKg = weights.get(member.memberId) ?? 0;
    return {
      memberId: member.memberId,
      memberCode: member.memberCode,
      memberName: member.memberName,
      dryWeightKg,
      amount: state.appliedRate === null ? 0 : dryWeightKg * state.appliedRate,
    };
  });
}

// ตรวจสอบว่าปีที่เลือก เคยมีการจ่ายปันผลไปแล้วหรือไม่
const yearAlreadyPaid = () => state.data.paidYears.includes(state.year);

// -----------------------------------------------------------------------------
// การจ่ายเงินปันผลจริง (ส่งคำขอไปเซิร์ฟเวอร์)
// -----------------------------------------------------------------------------
async function payDividend() {
  state.payError = null;
  try {
    const res = await fetch("/api/dividends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buddhistYear: state.year,
        rate: state.appliedRate,
        periodLabel: DIVIDEND_PERIOD_LABEL,
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "ไม่สามารถบันทึกการจ่ายปันผลได้");

    state.paid = true;
    // เพิ่มปีนี้เข้าในรายการปีที่จ่ายแล้ว เพื่อล็อกไม่ให้กดจ่ายซ้ำ
    state.data.paidYears = [...state.data.paidYears, state.year];
    await reloadData();
  } catch (err) {
    state.payError = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    render();
  }
}

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("dividends");
  state.data = data;
  state.year = new Date().getUTCFullYear() + 543; // ค่าเริ่มต้นเป็นปี พ.ศ. ปัจจุบัน
  render();
  page.hidden = false;
} catch (error) {
  showPageLoadError(page, error);
}

// =============================================================================
// ไฟล์: explained_code/08_ราคากลางประจำวัน_reference_price.js
// หน้าที่: ควบคุมการทำงานของหน้า "ราคากลางประจำวัน" (Daily Reference Price)
// ไฟล์ HTML ที่คู่กัน: pages/reference-price.html
// เส้นทาง URL: /reference-price
// ตารางฐานข้อมูลหลัก: ReferencePrice, ReferencePriceHistory
// ความสำคัญทางธุรกิจ:
//   กำหนดราคารับซื้อน้ำยางพาราประจำวัน (บาท/กก.)
//   ราคานี้จะถูกดึงไปแสดงและคำนวณอัตโนมัติในหน้า "การรับซื้อน้ำยาง"
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../public/js/core/dom.js";
import { loadPageData, showPageLoadError } from "../public/js/core/page-data.js";
import { formatDateTimeThai, formatDateUtc, formatNumber } from "/shared/format.js";
import { initSidebar } from "../public/js/components/sidebar.js";
import { paginate, renderPagination, totalPagesOf } from "../public/js/components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;

// หาวันที่ปัจจุบันตามเวลาประเทศไทย
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function todayIso() {
  return bangkokDateFormatter.format(new Date());
}

const dateInput = byId("price-date");
const priceInput = byId("price-value");
const submitButton = byId("price-submit");
const errorElement = byId("price-error");

const state = {
  log: [],          // ประวัติการบันทึกราคาทุกครั้ง (เรียงจากล่าสุดไปอดีต)
  page: 1,
  submitting: false,
  error: null,
};

/**
 * วาดตารางประวัติการตั้งราคากลาง พร้อมระบบแบ่งหน้า
 */
function renderLog() {
  const hasLog = state.log.length > 0;
  byId("log-empty").hidden = hasLog;
  byId("log-section").hidden = !hasLog;
  if (!hasLog) return;

  // ใช้ฟังก์ชัน paginate แบ่งข้อมูลทีละ 10 รายการ
  byId("log-rows").replaceChildren(
    ...paginate(state.log, state.page, PAGE_SIZE).map((entry) => {
      const row = cloneTemplate("log-row-template");
      setSlot(row, "date", formatDateUtc(entry.date));
      setSlot(row, "price", formatNumber(entry.price));
      setSlot(row, "recordedAt", formatDateTimeThai(entry.recordedAt));
      return row;
    })
  );

  renderPagination(byId("log-pagination"), {
    page: state.page,
    totalPages: totalPagesOf(state.log, PAGE_SIZE),
    onPageChange: (page) => {
      state.page = page;
      renderLog();
    },
  });
}

function renderForm() {
  submitButton.disabled = state.submitting;
  submitButton.textContent = state.submitting ? "กำลังบันทึก..." : "บันทึก";
  errorElement.textContent = state.error ?? "";
  errorElement.hidden = !state.error;
}

// -----------------------------------------------------------------------------
// บันทึกราคากลางประจำวัน
// -----------------------------------------------------------------------------
byId("price-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.error = null;

  const numericPrice = Number(priceInput.value);
  if (!numericPrice || numericPrice <= 0) {
    state.error = "กรุณากรอกราคากลางให้ถูกต้อง";
    renderForm();
    return;
  }

  state.submitting = true;
  renderForm();
  try {
    const res = await fetch("/api/reference-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateInput.value, price: numericPrice }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกราคาได้");

    // บันทึกสำเร็จ: นำรายการใหม่มาแทรกไว้บนสุดของตารางประวัติ และกลับไปหน้าแรก
    state.log = [data, ...state.log];
    state.page = 1;
    priceInput.value = "";
    renderLog();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
  } finally {
    state.submitting = false;
    renderForm();
  }
});

// โหลดข้อมูลเริ่มต้น
try {
  const data = await loadPageData("reference-price");
  dateInput.value = data.today ?? todayIso();
  state.log = data.history ?? [];
  renderLog();
  renderForm();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

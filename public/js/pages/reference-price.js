// =============================================================================
// public/js/pages/reference-price.js
// -----------------------------------------------------------------------------
// การทำงานของหน้า "ราคากลางประจำวัน" (pages/reference-price.html)
//
//   - ฟอร์ม: เลือกวันที่ (ค่าเริ่มต้น = วันนี้ตามเวลาไทย) + กรอกราคา → บันทึก
//   - ตาราง: ประวัติการบันทึกราคาทุกครั้ง (ล่าสุดก่อน) แบ่งหน้าละ 10 รายการ
//     บันทึกสำเร็จแล้วรายการใหม่จะขึ้นบนสุด และกลับไปหน้า 1
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../core/dom.js";
import { loadPageData, showPageLoadError } from "../core/page-data.js";
import { formatDateTimeThai, formatDateUtc, formatNumber } from "/shared/format.js";
import { initSidebar } from "../components/sidebar.js";
import { paginate, renderPagination, totalPagesOf } from "../components/pagination.js";

initSidebar();

const PAGE_SIZE = 10;

// วันนี้ตามเวลาประเทศไทย (ผู้ดูแลคิดราคาตามวันของไทย)
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
  log: [], // ประวัติการบันทึกราคา
  page: 1,
  submitting: false,
  error: null,
};

// -----------------------------------------------------------------------------
// วาดตารางประวัติ + ตัวแบ่งหน้า
// -----------------------------------------------------------------------------
function renderLog() {
  const hasLog = state.log.length > 0;
  byId("log-empty").hidden = hasLog;
  byId("log-section").hidden = !hasLog;
  if (!hasLog) return;

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

// สถานะปุ่มบันทึก และข้อความผิดพลาด
function renderForm() {
  submitButton.disabled = state.submitting;
  submitButton.textContent = state.submitting ? "กำลังบันทึก..." : "บันทึก";
  errorElement.textContent = state.error ?? "";
  errorElement.hidden = !state.error;
}

// -----------------------------------------------------------------------------
// บันทึกราคา
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
    if (!res.ok) {
      throw new Error(data.error ?? "ไม่สามารถบันทึกราคากลางได้");
    }
    // เพิ่มรายการใหม่ไว้บนสุด แล้วกลับไปหน้าแรก
    state.log = [data.log, ...state.log];
    state.page = 1;
    renderLog();
  } catch (err) {
    state.error = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
  } finally {
    state.submitting = false;
    renderForm();
  }
});

// -----------------------------------------------------------------------------
// เริ่มต้นหน้า
// -----------------------------------------------------------------------------
dateInput.value = todayIso();

try {
  const data = await loadPageData("reference-price");
  state.log = data.initialLog;
  renderLog();
  renderForm();
  byId("page-content").hidden = false;
} catch (error) {
  showPageLoadError(byId("page-content"), error);
}

// =============================================================================
// public/js/components/live-clock.js
// -----------------------------------------------------------------------------
// นาฬิกาแสดงเวลาปัจจุบัน (ชั่วโมง:นาที:วินาที) ที่มุมขวาบนของหน้ารับซื้อ/เบิกเงิน
// เริ่มต้นแสดง "--:--:--" แล้วอัปเดตทุก 1 วินาที (เหมือนของเดิม)
// =============================================================================

// แปลงเวลาเป็นข้อความ HH:MM:SS
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// element = ช่องที่จะแสดงเวลา
export function startLiveClock(element) {
  element.textContent = "--:--:--";
  setInterval(() => {
    element.textContent = formatTime(new Date());
  }, 1000);
}

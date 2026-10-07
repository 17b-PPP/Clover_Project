// =============================================================================
// public/js/charts/react-chart-root.js
// -----------------------------------------------------------------------------
// ตัวช่วยวาดกราฟ React ลงในกล่อง HTML ธรรมดา
//
// กราฟทั้งหมดในเว็บใช้ไลบรารี recharts (ต้องทำงานบน React) ไฟล์นี้จัดการ
// "ราก" (root) ของ React ให้: สร้างเมื่อมีข้อมูลต้องแสดง และถอดออกเมื่อไม่มีข้อมูล
// (เหมือนของเดิมที่กราฟถูกถอดออกแล้วแสดงข้อความ "ไม่มีข้อมูล" แทน)
// =============================================================================

import { createRoot } from "/vendor/react-recharts.js";

export function createChartRoot(container) {
  let root = null;

  return {
    // วาด/อัปเดตกราฟ (element = ผลลัพธ์จาก React.createElement)
    render(element) {
      if (!root) root = createRoot(container);
      root.render(element);
    },

    // ถอดกราฟออก (ครั้งหน้าที่ render จะเริ่มแอนิเมชันใหม่ตั้งแต่ต้น)
    unmount() {
      if (root) {
        root.unmount();
        root = null;
      }
    },
  };
}

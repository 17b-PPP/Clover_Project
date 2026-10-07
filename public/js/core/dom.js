// =============================================================================
// public/js/core/dom.js
// -----------------------------------------------------------------------------
// ฟังก์ชันช่วยจัดการหน้าเว็บ (DOM) ที่ทุกหน้าใช้ร่วมกัน
//
// แนวคิดหลักของเวอร์ชัน HTML/CSS/JS นี้:
//   - โครงหน้าตา (markup) ทั้งหมดเขียนไว้ในไฟล์ HTML
//   - ส่วนที่ต้องทำซ้ำหลายแถว (เช่น แถวตาราง) เขียนเป็น <template> ไว้ใน HTML
//   - JavaScript แค่ "คัดลอก template แล้วเติมข้อมูล" ผ่าน data-slot
//
// ตัวอย่าง HTML:   <template id="row-template"><tr><td data-slot="name"></td></tr></template>
// ตัวอย่าง JS:     const row = cloneTemplate("row-template");
//                  setSlot(row, "name", "สมชาย");
// =============================================================================

// ค้นหาองค์ประกอบด้วย id (โยน error ทันทีถ้าไม่พบ เพื่อให้หาจุดผิดได้ง่าย)
export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`ไม่พบองค์ประกอบ id="${id}" ในหน้า HTML`);
  return element;
}

// คัดลอกเนื้อหาจาก <template id="..."> (คืนองค์ประกอบตัวแรกใน template)
export function cloneTemplate(id) {
  const template = byId(id);
  return template.content.firstElementChild.cloneNode(true);
}

// หาองค์ประกอบลูกที่มี data-slot="name" (รวมตัว root เองด้วย)
export function slot(root, name) {
  if (root.matches?.(`[data-slot="${name}"]`)) return root;
  const element = root.querySelector(`[data-slot="${name}"]`);
  if (!element) throw new Error(`ไม่พบ data-slot="${name}"`);
  return element;
}

// เติมข้อความลงทุกช่องที่มี data-slot="name"
// (ใช้ textContent จึงปลอดภัยจากการแทรกโค้ด HTML)
export function setSlot(root, name, text) {
  const elements = root.matches?.(`[data-slot="${name}"]`)
    ? [root]
    : [...root.querySelectorAll(`[data-slot="${name}"]`)];
  if (elements.length === 0) throw new Error(`ไม่พบ data-slot="${name}"`);
  for (const element of elements) element.textContent = text;
}

// หาปุ่ม/องค์ประกอบที่มี data-action="name"
export function action(root, name) {
  const element = root.querySelector(`[data-action="${name}"]`);
  if (!element) throw new Error(`ไม่พบ data-action="${name}"`);
  return element;
}

// แสดง (true) หรือซ่อน (false) องค์ประกอบ ด้วย attribute hidden
export function setVisible(element, visible) {
  element.hidden = !visible;
}

// ลบลูกทั้งหมดขององค์ประกอบ
export function clearChildren(element) {
  element.replaceChildren();
}

// อ่านข้อมูลโครงหน้าที่เซิร์ฟเวอร์ฝังไว้ใน <script id="layout-data" type="application/json">
// (เช่น ข้อมูลผู้ใช้สำหรับเมนูด้านซ้าย)
export function readLayoutData() {
  const element = document.getElementById("layout-data");
  if (!element) return null;
  return JSON.parse(element.textContent);
}

// สั่งให้แอนิเมชัน CSS ขององค์ประกอบเล่นใหม่อีกครั้ง
// (ใช้เมื่อเนื้อหาหน้าต่างเปลี่ยนแบบ "สร้างใหม่" เพื่อให้มีจังหวะเหมือนเดิม)
export function restartAnimation(element) {
  element.style.animation = "none";
  void element.offsetWidth; // บังคับให้เบราว์เซอร์คำนวณหน้าใหม่ก่อนเปิดแอนิเมชันกลับ
  element.style.animation = "";
}

// =============================================================================
// ไฟล์: explained_code/01_login_เจ้าหน้าที่.js
// หน้าที่: ควบคุมการทำงานของหน้าเข้าสู่ระบบสำหรับพนักงานและผู้ดูแลระบบ (Staff & Admin)
// ไฟล์ HTML ที่คู่กัน: pages/login.html
// เส้นทาง URL: /login
// API ที่เรียกใช้: POST /api/auth/login
// =============================================================================

// -----------------------------------------------------------------------------
// [ส่วนที่ 1] การนำเข้าโมดูล (Import Modules)
// -----------------------------------------------------------------------------

// byId: ฟังก์ชันผู้ช่วย (Helper function) ย่อมาจาก document.getElementById(id)
// ช่วยค้นหาอิลิเมนต์ (HTML Element) ตาม id เพื่อนำมาควบคุมด้วย JavaScript
import { byId } from "../public/js/core/dom.js";

// sanitizeNext: ฟังก์ชันตรวจสอบความปลอดภัยของ URL ป้องกันช่องโหว่ Open Redirect Attack
// เพื่อให้แน่ใจว่าเมื่อล็อกอินเสร็จ ระบบจะเปลี่ยนหน้าไปเฉพาะภายในเว็บไซต์ของเราเท่านั้น
import { sanitizeNext } from "../public/js/core/safe-redirect.js";

// setupPasswordFields: ฟังก์ชันติดตั้งปุ่ม "ดวงตา" เพื่อกดเปิด-ปิดการซ่อนรหัสผ่านในฟอร์ม
import { setupPasswordFields } from "../public/js/components/password-input.js";

// -----------------------------------------------------------------------------
// [ส่วนที่ 2] การอ้างอิงองค์ประกอบบนหน้าเว็บ (DOM Elements Selection)
// -----------------------------------------------------------------------------

// ดึงแท็ก <form id="login-form"> มาเก็บในตัวแปร form เพื่อใช้ดักจับการกดปุ่ม Submit
const form = byId("login-form");

// ดึงช่องกรอกชื่อผู้ใช้งาน <input id="username">
const usernameInput = byId("username");

// ดึงช่องกรอกรหัสผ่าน <input id="password">
const passwordInput = byId("password");

// ดึงกล่องข้อความแจ้งเตือนสีแดง <p id="login-error"> เพื่อแสดงข้อผิดพลาดถ้าล็อกอินไม่ผ่าน
const errorElement = byId("login-error");

// ดึงปุ่มกดเข้าสู่ระบบ <button id="login-submit"> เพื่อควบคุมการกดและการเปลี่ยนข้อความบนปุ่ม
const submitButton = byId("login-submit");

// เรียกใช้งานระบบเปิด-ปิดลูกตาดูรหัสผ่านสำหรับฟอร์มนี้
setupPasswordFields(form);

// -----------------------------------------------------------------------------
// [ส่วนที่ 3] ฟังก์ชันผู้ช่วยจัดการ UI (UI Helper Functions)
// -----------------------------------------------------------------------------

/**
 * ฟังก์ชัน: setError
 * หน้าที่: แสดงหรือซ่อนข้อความแจ้งเตือนข้อผิดพลาดสีแดงใต้ฟอร์ม
 * @param {string|null} message - ข้อความผิดพลาดที่ต้องการแสดง (ถ้าเป็น null จะซ่อนกล่อง)
 */
function setError(message) {
  // ใส่ข้อความลงในแท็กแจ้งเตือน (ถ้า message เป็น null/undefined ให้ใส่สตริงว่าง "")
  errorElement.textContent = message ?? "";

  // ควบคุมคุณสมบัติ hidden: ถ้ามีข้อความ (message ไม่ใช่ null) ให้แสดง (hidden = false)
  // ถ้าไม่มีข้อความ ให้ซ่อน (hidden = true)
  errorElement.hidden = !message;
}

/**
 * ฟังก์ชัน: setSubmitting
 * หน้าที่: ควบคุมสถานะปุ่มเข้าสู่ระบบเพื่อป้องกันการกดซ้ำซ้อน (Debouncing / Double Click)
 * @param {boolean} submitting - true = กำลังส่งข้อมูล, false = ส่งข้อมูลเสร็จแล้ว
 */
function setSubmitting(submitting) {
  // ปิดการใช้งานปุ่ม (disabled = true) เมื่อกำลังส่งข้อมูล เพื่อไม่ให้ผู้ใช้คลิกซ้ำๆ
  submitButton.disabled = submitting;

  // เปลี่ยนข้อความบนปุ่มเพื่อให้ผู้ใช้รู้ว่าระบบกำลังทำงานอยู่
  submitButton.textContent = submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ";
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 4] เหตุการณ์เมื่อส่งฟอร์ม (Form Submission Event Listener)
// -----------------------------------------------------------------------------

// ดักจับเหตุการณ์ "submit" เมื่อผู้ใช้กดปุ่ม "เข้าสู่ระบบ" หรือกด Enter ในฟอร์ม
form.addEventListener("submit", async (event) => {
  // event.preventDefault(): ยกเลิกพฤติกรรมดั้งเดิมของเบราว์เซอร์
  // เพื่อป้องกันไม่ให้หน้าเว็บรีเฟรชหรือส่งฟอร์มแบบ Synchronous ดั้งเดิม
  event.preventDefault();

  // ปรับสถานะปุ่มเป็น "กำลังเข้าสู่ระบบ..." และปิดไม่ให้คลิกซ้ำ
  setSubmitting(true);

  // ล้างข้อความแจ้งเตือนข้อผิดพลาดเดิมออกก่อน (ถ้ามี)
  setError(null);

  try {
    // ส่งคำขอแบบ Asynchronous HTTP POST ไปยัง Backend API
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // แปลงข้อมูลอ็อบเจกต์ JavaScript เป็นข้อความ JSON
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value,
      }),
    });

    // ตรวจสอบว่า HTTP Status Code สำเร็จหรือไม่ (เช่น 200 OK)
    if (!res.ok) {
      // ถ้าไม่สำเร็จ (เช่น 401 Unauthorized หรือ 400 Bad Request) ดึงข้อความ error จากเซิร์ฟเวอร์
      const data = await res.json();
      throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    }

    // ดึงค่า ?next= จาก URL Query String เพื่อดูว่าก่อนหน้านี้ผู้ใช้พยายามเข้าหน้าไหน
    // เช่น ถ้าผู้ใช้พยายามเข้า /users แต่ยังไม่ได้ล็อกอิน URL จะเป็น /login?next=/users
    const searchParams = new URLSearchParams(window.location.search);
    const nextParam = searchParams.get("next");

    // ตรวจสอบความปลอดภัยด้วย sanitizeNext: ป้องกันไม่ให้ Redirect ออกนอกโดเมนของเว็บเรา
    // หากไม่มีการระบุ ?next ให้พาไปหน้าแรก "/" (ซึ่งระบบจะ Redirect ต่อไปที่ /members)
    const next = sanitizeNext(nextParam, "/");

    // สั่งเปลี่ยนหน้าเว็บไปยัง URL ปลายทาง
    window.location.href = next;

  } catch (err) {
    // หากเกิดข้อผิดพลาด ให้แสดงข้อความเตือนสีแดงให้ผู้ใช้ทราบ
    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ");
  } finally {
    // บล็อก finally จะทำงานเสมอไม่ว่าจะสำเร็จหรือล้มเหลว
    // ปลดล็อกปุ่มให้กลับมาคลิกใหม่ได้ตามปกติ
    setSubmitting(false);
  }
});

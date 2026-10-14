// =============================================================================
// ไฟล์: explained_code/02_login_สมาชิก.js
// หน้าที่: ควบคุมการทำงานของหน้าเข้าสู่ระบบสำหรับสมาชิกชาวสวนยาง (Member Login)
// ไฟล์ HTML ที่คู่กัน: pages/member-login.html
// เส้นทาง URL: /member/login
// API ที่เรียกใช้: POST /api/member-auth/login
// =============================================================================

// -----------------------------------------------------------------------------
// [ส่วนที่ 1] การนำเข้าโมดูล (Import Modules)
// -----------------------------------------------------------------------------

import { byId } from "../public/js/core/dom.js";
import { sanitizeNext } from "../public/js/core/safe-redirect.js";
import { setupPasswordFields } from "../public/js/components/password-input.js";

// -----------------------------------------------------------------------------
// [ส่วนที่ 2] การอ้างอิงองค์ประกอบบนหน้าเว็บ (DOM Selection)
// -----------------------------------------------------------------------------

// ดึงแท็กฟอร์ม <form id="member-login-form">
const form = byId("member-login-form");

// ดึงช่องกรอกเลขบัตรประชาชน 13 หลัก <input id="id-card-number">
const idCardInput = byId("id-card-number");

// ดึงช่องกรอกวันเดือนปีเกิด 8 หลัก <input id="date-of-birth"> (เช่น 01012540)
const dateOfBirthInput = byId("date-of-birth");

// ดึงกล่องแจ้งข้อผิดพลาด <p id="login-error">
const errorElement = byId("login-error");

// ดึงปุ่มเข้าสู่ระบบ <button id="login-submit">
const submitButton = byId("login-submit");

// ติดตั้งระบบแสดง/ซ่อนตาดูรหัสผ่านสำหรับช่องวันเกิด
setupPasswordFields(form);

// -----------------------------------------------------------------------------
// [ส่วนที่ 3] การกรองอักขระแบบเรียลไทม์ (Real-time Input Sanitization)
// -----------------------------------------------------------------------------

// ป้องกันผู้ใช้เผลอกรอกตัวอักษรหรือสัญลักษณ์พิเศษ เช่น ขีด (-), ช่องว่าง, หรือตัวหนังสือ
// ดักจับเหตุการณ์ "input" ซึ่งจะทำงานทันทีทุกครั้งที่แป้นพิมพ์ถูกกดหรือมีการ Paste ข้อความ
for (const input of [idCardInput, dateOfBirthInput]) {
  input.addEventListener("input", () => {
    // ใช้ Regular Expression: \D หมายถึงอักขระใดๆ ที่ "ไม่ใช่ตัวเลข"
    // .replace(/\D/g, "") จะลบตัวอักษรที่ไม่ใช่ตัวเลข 0-9 ทิ้งทั้งหมด
    const digits = input.value.replace(/\D/g, "");

    // ถ้าค่าเดิมมีตัวอักษรปนอยู่ ให้แทนที่ด้วยค่าตัวเลขล้วนทันที
    if (digits !== input.value) {
      input.value = digits;
    }
  });
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 4] ฟังก์ชันผู้ช่วยจัดการสถานะ UI (UI State Management)
// -----------------------------------------------------------------------------

/**
 * ฟังก์ชัน: setError
 * หน้าที่: แสดงหรือซ่อนข้อความแจ้งเตือนสีแดง
 */
function setError(message) {
  errorElement.textContent = message ?? "";
  errorElement.hidden = !message;
}

/**
 * ฟังก์ชัน: setSubmitting
 * หน้าที่: ควบคุมการเปิด/ปิดปุ่มเพื่อป้องกันการกดย้ำๆ
 */
function setSubmitting(submitting) {
  submitButton.disabled = submitting;
  submitButton.textContent = submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ";
}

// -----------------------------------------------------------------------------
// [ส่วนที่ 5] การส่งข้อมูลเข้าสู่ระบบ (Form Submit Handler)
// -----------------------------------------------------------------------------

form.addEventListener("submit", async (event) => {
  // ป้องกันการรีเฟรชหน้าเว็บ
  event.preventDefault();

  setSubmitting(true);
  setError(null);

  try {
    // ส่งข้อมูลไปตรวจสอบที่ Backend ของสมาชิก
    const res = await fetch("/api/member-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCardNumber: idCardInput.value,
        dateOfBirth: dateOfBirthInput.value,
      }),
    });

    // หากไม่ถูกต้อง (เช่น ไม่มีข้อมูลในระบบ, วันเกิดไม่ตรง, หรือสมาชิกถูกระงับ)
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
    }

    // หากสำเร็จ หาหน้าที่ต้องการไปต่อ (Default คือหน้าแดชบอร์ดสมาชิก /member/dashboard)
    const next = sanitizeNext(
      new URLSearchParams(window.location.search).get("next"),
      "/member/dashboard"
    );

    // นำสมาชิกเข้าสู่หน้าพอร์ทัลส่วนตัว
    window.location.href = next;

  } catch (err) {
    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
  } finally {
    setSubmitting(false);
  }
});

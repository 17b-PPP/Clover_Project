// =============================================================================
// public/js/pages/member-login.js
// -----------------------------------------------------------------------------
// การทำงานของหน้าเข้าสู่ระบบสมาชิก (pages/member-login.html)
//
//   1. สมาชิกกรอกเลขบัตรประชาชน 13 หลัก และวันเกิด 8 หลัก (รับเฉพาะตัวเลข)
//   2. ส่งไป POST /api/member-auth/login
//   3. สำเร็จ → ไปหน้าที่ระบุใน ?next= (หรือ /member/dashboard)
//      ไม่สำเร็จ → แสดงข้อความสีแดง
// =============================================================================

import { byId } from "../core/dom.js";
import { sanitizeNext } from "../core/safe-redirect.js";
import { setupPasswordFields } from "../components/password-input.js";

const form = byId("member-login-form");
const idCardInput = byId("id-card-number");
const dateOfBirthInput = byId("date-of-birth");
const errorElement = byId("login-error");
const submitButton = byId("login-submit");

setupPasswordFields(form);

// ช่องที่รับเฉพาะตัวเลข: ตัดอักขระอื่นทิ้งทันทีที่พิมพ์
for (const input of [idCardInput, dateOfBirthInput]) {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "");
    if (digits !== input.value) input.value = digits;
  });
}

function setError(message) {
  errorElement.textContent = message ?? "";
  errorElement.hidden = !message;
}

function setSubmitting(submitting) {
  submitButton.disabled = submitting;
  submitButton.textContent = submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/member-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCardNumber: idCardInput.value,
        dateOfBirth: dateOfBirthInput.value,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    }
    const next = sanitizeNext(
      new URLSearchParams(window.location.search).get("next"),
      "/member/dashboard"
    );
    window.location.href = next;
  } catch (err) {
    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
  } finally {
    setSubmitting(false);
  }
});

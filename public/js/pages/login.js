// =============================================================================
// public/js/pages/login.js
// -----------------------------------------------------------------------------
// การทำงานของหน้าเข้าสู่ระบบพนักงาน (pages/login.html)
//
//   1. ผู้ใช้กรอกชื่อผู้ใช้งาน + รหัสผ่าน แล้วกดเข้าสู่ระบบ
//   2. ส่งไป POST /api/auth/login
//   3. สำเร็จ → ไปหน้าที่ระบุใน ?next= (หรือหน้าแรก "/")
//      ไม่สำเร็จ → แสดงข้อความสีแดงใต้ฟอร์ม
// =============================================================================

import { byId } from "../core/dom.js";
import { sanitizeNext } from "../core/safe-redirect.js";
import { setupPasswordFields } from "../components/password-input.js";

const form = byId("login-form");
const usernameInput = byId("username");
const passwordInput = byId("password");
const errorElement = byId("login-error");
const submitButton = byId("login-submit");

setupPasswordFields(form);

// แสดงข้อความผิดพลาด (null = ซ่อน)
function setError(message) {
  errorElement.textContent = message ?? "";
  errorElement.hidden = !message;
}

// แสดงสถานะ "กำลังเข้าสู่ระบบ" บนปุ่ม
function setSubmitting(submitting) {
  submitButton.disabled = submitting;
  submitButton.textContent = submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    }
    const next = sanitizeNext(new URLSearchParams(window.location.search).get("next"), "/");
    window.location.href = next;
  } catch (err) {
    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
  } finally {
    setSubmitting(false);
  }
});

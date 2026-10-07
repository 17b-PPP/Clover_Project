// =============================================================================
// public/js/components/password-input.js
// -----------------------------------------------------------------------------
// ปุ่มรูปตาสำหรับ "แสดง/ซ่อนรหัสผ่าน" ในช่องกรอกรหัสผ่าน
//
// โครง HTML ที่ใช้:
//   <div class="password-field">
//     <div class="field"> ...label... <input type="password" class="input"> </div>
//     <button type="button" class="password-toggle" aria-label="แสดงรหัสผ่าน" aria-pressed="false">
//       <svg data-icon="eye">...</svg>
//       <svg data-icon="eye-off" hidden>...</svg>
//     </button>
//   </div>
// =============================================================================

// ตั้งค่าปุ่มรูปตาของช่องรหัสผ่านหนึ่งช่อง คืนค่าฟังก์ชัน reset() สำหรับกลับเป็น "ซ่อน"
export function setupPasswordField(wrapper) {
  const input = wrapper.querySelector("input");
  const toggle = wrapper.querySelector(".password-toggle");
  const eyeIcon = toggle.querySelector('[data-icon="eye"]');
  const eyeOffIcon = toggle.querySelector('[data-icon="eye-off"]');
  let showPassword = false;

  // แสดงผลตามสถานะ: แสดงรหัส = ช่องเป็น text + ไอคอนตาขีดฆ่า
  function render() {
    input.type = showPassword ? "text" : "password";
    toggle.setAttribute("aria-label", showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
    toggle.setAttribute("aria-pressed", String(showPassword));
    eyeIcon.hidden = showPassword;
    eyeOffIcon.hidden = !showPassword;
  }

  toggle.addEventListener("click", () => {
    showPassword = !showPassword;
    render();
  });

  render();

  return {
    reset() {
      showPassword = false;
      render();
    },
  };
}

// ตั้งค่าทุกช่องรหัสผ่านที่อยู่ภายใน root
export function setupPasswordFields(root = document) {
  return [...root.querySelectorAll(".password-field")].map(setupPasswordField);
}

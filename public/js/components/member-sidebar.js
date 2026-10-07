// =============================================================================
// public/js/components/member-sidebar.js
// -----------------------------------------------------------------------------
// การทำงานของเมนูด้านซ้ายในพอร์ทัลสมาชิก (โครง HTML: pages/partials/member-sidebar.html)
//
//   - แสดงโปรไฟล์จากข้อมูลที่เซิร์ฟเวอร์ฝังไว้ในหน้า (layout-data → profile)
//     มีรูป → แสดงรูปวงกลม, ไม่มีรูป → แสดงอักษรตัวแรกของชื่อ
//   - ไฮไลต์เมนูของหน้าปัจจุบัน (URL ต้องตรงกันพอดี)
//   - ปุ่มออกจากระบบ
// =============================================================================

import { byId, readLayoutData } from "../core/dom.js";

export function initMemberSidebar() {
  const { profile } = readLayoutData();
  const fullName = `${profile.firstName} ${profile.lastName}`;

  // รูปโปรไฟล์ หรืออักษรตัวแรกของชื่อ
  const photo = byId("profile-photo");
  const initial = byId("profile-initial");
  if (profile.photoUrl) {
    photo.src = profile.photoUrl;
    photo.alt = `รูปประจำตัวของ ${fullName}`;
    photo.hidden = false;
    initial.hidden = true;
  } else {
    initial.textContent = profile.firstName.charAt(0);
  }

  byId("profile-name").textContent = fullName;
  byId("profile-code").textContent = profile.memberCode;
  const garden = byId("profile-garden");
  if (profile.gardenName) {
    garden.textContent = `สวน${profile.gardenName}`;
    garden.hidden = false;
  }

  // เมนูที่ตรงกับหน้าปัจจุบัน
  for (const link of document.querySelectorAll("#member-sidebar .nav-link")) {
    link.classList.toggle("is-active", window.location.pathname === link.getAttribute("href"));
  }

  // ออกจากระบบ
  const logoutButton = byId("member-logout-button");
  const logoutLabel = byId("member-logout-label");
  let loggingOut = false;

  function renderLogout() {
    logoutButton.disabled = loggingOut;
    logoutLabel.textContent = loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ";
  }

  logoutButton.addEventListener("click", async () => {
    loggingOut = true;
    renderLogout();
    try {
      await fetch("/api/member-auth/logout", { method: "POST" });
      window.location.href = "/member/login";
    } finally {
      loggingOut = false;
      renderLogout();
    }
  });
}

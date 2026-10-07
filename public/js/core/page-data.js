// =============================================================================
// public/js/core/page-data.js
// -----------------------------------------------------------------------------
// โหลด "ข้อมูลเริ่มต้นของหน้า" จากเซิร์ฟเวอร์
//
//   loadPageData("members")          → GET /api/page-data/members      (ฝั่งพนักงาน)
//   loadMemberPortalData("finance")  → GET /api/member-portal/finance  (ฝั่งสมาชิก)
//
// ถ้าหมดสิทธิ์ระหว่างใช้งาน (เช่น cookie หมดอายุ) จะพาไปหน้าเข้าสู่ระบบให้อัตโนมัติ
// =============================================================================

// Promise ที่ไม่มีวันเสร็จ — ใช้หยุดการทำงานของหน้าไว้ระหว่างที่กำลังเปลี่ยนหน้า
function never() {
  return new Promise(() => {});
}

// ข้อมูลหน้าของพนักงาน
export async function loadPageData(name) {
  const res = await fetch(`/api/page-data/${name}`);

  // ยังไม่ได้เข้าสู่ระบบ → ไปหน้าเข้าสู่ระบบ แล้วกลับมาหน้านี้หลังเข้าสู่ระบบ
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return never();
  }
  // ไม่มีสิทธิ์ (ไม่ใช่ผู้ดูแลระบบ) → กลับหน้าแรก
  if (res.status === 403) {
    window.location.href = "/";
    return never();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "ไม่สามารถโหลดข้อมูลได้");
  }
  return res.json();
}

// ข้อมูลหน้าในพอร์ทัลสมาชิก
export async function loadMemberPortalData(name) {
  const res = await fetch(`/api/member-portal/${name}`);

  // ไม่มี session หรือสมาชิกถูกระงับ → เซิร์ฟเวอร์บอก URL ที่ต้องไป
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    window.location.href = body.redirect ?? "/member/login";
    return never();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "ไม่สามารถโหลดข้อมูลได้");
  }
  return res.json();
}

// แสดงข้อความแจ้งเตือนแทนเนื้อหา เมื่อโหลดข้อมูลของหน้าไม่สำเร็จ
export function showPageLoadError(container, error) {
  console.error(error);
  const message = document.createElement("p");
  message.className = "page-load-error";
  message.textContent = `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`;
  container.replaceChildren(message);
  container.hidden = false;
}

// =============================================================================
// public/js/components/notification-bell.js
// -----------------------------------------------------------------------------
// กระดิ่งแจ้งเตือนบนแถบด้านบนของพอร์ทัลสมาชิก
//
// - ตัวเลขสีแดงบนกระดิ่ง = จำนวนรายการ "ใหม่" ที่ยังไม่เคยเปิดดู (เกิน 9 แสดง "9+")
// - "อ่านแล้ว" ถูกจำไว้ในเบราว์เซอร์ (localStorage) เป็นเวลาของรายการล่าสุด
//   ณ ตอนที่เปิดกระดิ่งครั้งล่าสุด — รายการที่เกิดหลังเวลานั้นถือว่ายังไม่อ่าน
// - เปิดกระดิ่ง → รายการใหม่มีพื้นสีเขียวจางและจุดแดง และถือว่าอ่านหมดแล้ว
// - คลิกนอกกล่อง หรือกด Esc → ปิดกล่อง
// - เปิดหลายแท็บพร้อมกัน ตัวเลขจะอัปเดตตามกันผ่านเหตุการณ์ "storage"
// =============================================================================

import { byId, cloneTemplate, setSlot } from "../core/dom.js";
import { formatDateTimeThai, formatNumber } from "/shared/format.js";

// ข้อความ/สี/ไอคอนของแต่ละประเภทรายการ
const typeMeta = {
  PURCHASE: {
    title: "เงินเข้าจากการขายน้ำยาง",
    sign: "+",
    tone: "income", // สีเขียว
    icon: "M12 5v14M5 12l7 7 7-7",
  },
  WITHDRAWAL: {
    title: "เบิกเงินออก",
    sign: "-",
    tone: "withdrawal", // สีแดงอมชมพู
    icon: "M12 19V5M5 12l7-7 7 7",
  },
  DIVIDEND: {
    title: "ได้รับเงินปันผล",
    sign: "+",
    tone: "dividend", // สีส้มอำพัน
    icon: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
  },
};

// ชื่อเหตุการณ์ที่ใช้แจ้งแท็บเดียวกันว่าสถานะ "อ่านแล้ว" เปลี่ยน
const storageEvent = "member-notifications-seen";

function storageKey(memberId) {
  return `member-notifications-seen:${memberId}`;
}

// อ่านเวลา "อ่านล่าสุด" จาก localStorage ("" = ยังไม่เคยอ่าน)
function readSeenAt(memberId) {
  try {
    return localStorage.getItem(storageKey(memberId)) ?? "";
  } catch {
    return "";
  }
}

// memberId      = รหัสภายในของสมาชิก (ใช้แยกสถานะอ่านแล้วของแต่ละคน)
// notifications = [{ id, type, code, amount, occurredAt }, ...] เรียงใหม่สุดก่อน
export function initNotificationBell(memberId, notifications) {
  const container = byId("notification-bell");
  const button = byId("bell-button");
  const badge = byId("bell-badge");
  const panel = byId("bell-panel");

  let open = false;
  let highlightBefore = null; // เวลาที่ใช้ตัดสินว่ารายการไหน "ใหม่" ขณะเปิดกล่อง
  let seenAt = readSeenAt(memberId);

  // วาดกระดิ่งและตัวเลข
  function renderButton() {
    const unreadCount = notifications.filter((item) => item.occurredAt > seenAt).length;
    button.setAttribute(
      "aria-label",
      unreadCount > 0 ? `การแจ้งเตือน ${unreadCount} รายการใหม่` : "การแจ้งเตือน"
    );
    button.setAttribute("aria-expanded", String(open));
    badge.hidden = unreadCount === 0;
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  }

  // วาดกล่องรายการ
  function renderPanel() {
    panel.hidden = !open;
    if (!open) return;
    byId("bell-empty").hidden = notifications.length !== 0;
    const list = byId("bell-list");
    list.hidden = notifications.length === 0;
    list.replaceChildren(
      ...notifications.map((item) => {
        const meta = typeMeta[item.type];
        const isNew = highlightBefore !== null && item.occurredAt > highlightBefore;
        const li = cloneTemplate("bell-item-template");
        li.classList.add(`bell-item--${meta.tone}`);
        li.classList.toggle("is-new", isNew);
        li.querySelector('[data-slot="icon-path"]').setAttribute("d", meta.icon);
        setSlot(li, "title", meta.title);
        li.querySelector('[data-slot="new-dot"]').hidden = !isNew;
        setSlot(li, "amount", `${meta.sign}${formatNumber(item.amount)} บาท`);
        setSlot(li, "meta", `${item.code} · ${formatDateTimeThai(item.occurredAt)} น.`);
        return li;
      })
    );
  }

  function render() {
    renderButton();
    renderPanel();
  }

  // จดว่าอ่านถึงรายการล่าสุดแล้ว
  function markAllSeen() {
    const newest = notifications[0]?.occurredAt;
    if (!newest) return;
    try {
      localStorage.setItem(storageKey(memberId), newest);
    } catch {
      // เบราว์เซอร์ไม่อนุญาตให้บันทึก (เช่น โหมดส่วนตัว) — ตัวเลขจะค้างไว้แบบเดิม
    }
    window.dispatchEvent(new Event(storageEvent));
  }

  // สถานะอ่านแล้วเปลี่ยน (จากแท็บนี้หรือแท็บอื่น) → อ่านค่าใหม่แล้ววาดใหม่
  function handleStorageChange() {
    seenAt = readSeenAt(memberId);
    render();
  }
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(storageEvent, handleStorageChange);

  // คลิกนอกกล่อง / กด Esc → ปิด
  function handlePointer(event) {
    if (!container.contains(event.target)) setOpen(false);
  }
  function handleKey(event) {
    if (event.key === "Escape") setOpen(false);
  }

  function setOpen(value) {
    if (open === value) return;
    open = value;
    if (open) {
      document.addEventListener("mousedown", handlePointer);
      document.addEventListener("keydown", handleKey);
    } else {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    }
    render();
  }

  button.addEventListener("click", () => {
    if (!open) {
      // จำว่าก่อนเปิดอ่านถึงไหน เพื่อไฮไลต์รายการใหม่ไว้ระหว่างที่กล่องเปิดอยู่
      highlightBefore = seenAt ?? "";
      markAllSeen();
    }
    setOpen(!open);
  });

  byId("bell-finance-link").addEventListener("click", () => setOpen(false));

  render();
}

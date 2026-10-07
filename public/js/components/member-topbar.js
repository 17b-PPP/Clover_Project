// =============================================================================
// public/js/components/member-topbar.js
// -----------------------------------------------------------------------------
// เติมข้อมูลในแถบด้านบนของพอร์ทัลสมาชิก (โครง HTML: pages/partials/member-topbar.html)
//   - "สวัสดี คุณ<ชื่อ> <นามสกุล>"
//   - "ข้อมูลล่าสุด ณ <วันเวลาที่อ่านข้อมูล> น."
//   - ราคากลางน้ำยางประจำวัน (หรือ "ยังไม่มีข้อมูลราคากลาง")
//   - กระดิ่งแจ้งเตือน
// =============================================================================

import { byId } from "../core/dom.js";
import { formatCurrency, formatDateTimeThai, formatDateUtc } from "/shared/format.js";
import { initNotificationBell } from "./notification-bell.js";

// portal = { memberId, profile, marketPrice, fetchedAt } จาก /api/member-portal/...
export function renderMemberTopbar(portal, notifications) {
  const { profile, marketPrice, fetchedAt } = portal;

  byId("topbar-name").textContent = `${profile.firstName} ${profile.lastName}`;
  byId("topbar-fetched-at").textContent = formatDateTimeThai(fetchedAt);

  byId("market-price-present").hidden = !marketPrice;
  byId("market-price-missing").hidden = Boolean(marketPrice);
  if (marketPrice) {
    byId("market-price-value").textContent = formatCurrency(marketPrice.price);
    byId("market-price-date").textContent = formatDateUtc(marketPrice.recordDate);
  }

  initNotificationBell(portal.memberId, notifications);
}

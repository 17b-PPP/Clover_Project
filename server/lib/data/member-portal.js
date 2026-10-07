// =============================================================================
// server/lib/data/member-portal.js
// -----------------------------------------------------------------------------
// ข้อมูลสำหรับ "พอร์ทัลสมาชิก" (หน้าที่สมาชิกเข้าสู่ระบบมาดูข้อมูลของตัวเอง)
//
// ประกอบด้วย:
//   - requireMemberPortal          : ตรวจ session + สถานะสมาชิก และดึงโปรไฟล์/ราคากลาง
//   - getDailyMarketPrice          : ราคากลางล่าสุดที่ไม่เกินวันนี้
//   - getMemberWalletMonthlySummary: เงินที่ได้จากการขายในเดือนนี้
//   - getMemberEmployeeInfo        : ลูกจ้างที่มีสัญญาส่งน้ำยางแทนอยู่ในขณะนี้
//   - getMemberFinanceHistory      : ประวัติการเงิน (ขาย/เบิก/ปันผล) รวมเป็นรายการเดียว
//   - getMemberNotifications       : รายการแจ้งเตือนล่าสุดสำหรับกระดิ่ง
// =============================================================================

import { prisma } from "../prisma.js";
import { getMemberSession } from "../member-session.js";

// ใช้แทนคำสั่ง redirect() ของ Next.js: โยนออกไปพร้อม URL ที่ต้องพาผู้ใช้ไป
// ผู้เรียก (route ของหน้า/ API) จะจับแล้วสั่ง redirect หรือส่ง URL ให้หน้าเว็บ
export class PortalRedirect extends Error {
  constructor(location) {
    super(`Redirect to ${location}`);
    this.location = location;
  }
}

// ตัวจัดรูปแบบวันที่ตามเวลาประเทศไทย (en-CA ให้ผลเป็น YYYY-MM-DD)
const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// คีย์วันที่ "YYYY-MM-DD" ตามปฏิทินไทย
function bangkokDateKey(date) {
  return bangkokDateFormatter.format(date);
}

// recordDate เก็บเป็นเที่ยงคืน UTC ของวันทำการ จึงอ่านวันที่จากส่วน UTC
// (ห้ามใช้เวลาท้องถิ่นของเครื่องเซิร์ฟเวอร์)
function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// ปี/เดือนปัจจุบันตามวันที่ "ประเทศไทย" — ถ้าใช้นาฬิกาเซิร์ฟเวอร์ (UTC)
// ช่วงหัวค่ำของไทยอาจถูกนับเป็นเดือน/ปีก่อนหน้า
function currentThaiPeriod() {
  const [year, month] = bangkokDateKey(new Date()).split("-").map(Number);
  return { year, month };
}

// ราคากลางที่แสดงบนแถบด้านบนของพอร์ทัล
// ใช้ราคาของวันนี้ (ตามวันที่ไทย) ถ้ายังไม่ได้ตั้ง จะใช้ราคาของวันล่าสุดก่อนหน้า
// และจะไม่แสดงราคาที่ตั้งล่วงหน้าไว้สำหรับวันในอนาคต
export async function getDailyMarketPrice() {
  const today = new Date(bangkokDateKey(new Date()));
  const latest = await prisma.referencePrice.findFirst({
    where: { date: { lte: today } },
    orderBy: { date: "desc" },
    select: { price: true, date: true },
  });
  if (!latest) return null;
  return {
    price: latest.price.toNumber(),
    recordDate: latest.date.toISOString(),
  };
}

// ทุกหน้าในพอร์ทัลเรียกฟังก์ชันนี้ก่อนเสมอ
// - ไม่มี session → พาไปหน้าเข้าสู่ระบบสมาชิก
// - สมาชิกถูกลบหรือถูกระงับระหว่างใช้งาน → บังคับออกจากระบบทันที
//   (ไม่ปล่อยให้ใช้งานต่อจนกว่า cookie จะหมดอายุ)
export async function requireMemberPortal(req) {
  const session = getMemberSession(req);
  if (!session) {
    throw new PortalRedirect("/member/login");
  }

  const [member, marketPrice] = await Promise.all([
    prisma.member.findUnique({
      where: { id: session.memberId },
      select: {
        id: true,
        memberCode: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        gardenName: true,
        walletBalance: true,
        dividendBalance: true,
        status: true,
      },
    }),
    getDailyMarketPrice(),
  ]);

  if (!member || member.status !== "Active") {
    throw new PortalRedirect("/api/member-auth/force-logout");
  }

  return {
    memberId: member.id,
    profile: {
      id: member.id,
      memberCode: member.memberCode,
      firstName: member.firstName,
      lastName: member.lastName,
      photoUrl: member.photoUrl,
      gardenName: member.gardenName,
      walletBalance: member.walletBalance.toNumber(),
      dividendBalance: member.dividendBalance.toNumber(),
    },
    marketPrice,
    fetchedAt: new Date().toISOString(), // เวลาที่อ่านข้อมูลจากฐานข้อมูล
  };
}

// ยอดเงินที่สมาชิกได้จากการขายน้ำยาง "ในเดือนนี้" (แสดงบนการ์ดกระเป๋าเงิน)
export async function getMemberWalletMonthlySummary(memberId) {
  const { year, month } = currentThaiPeriod();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));

  const result = await prisma.purchase.aggregate({
    where: { memberId, recordDate: { gte: monthStart, lt: nextMonthStart } },
    _sum: { ownerPayout: true },
  });

  return {
    monthlyEarnings: result._sum.ownerPayout?.toNumber() ?? 0,
  };
}

// ลูกจ้างที่มีสัญญาใช้งานอยู่และยังไม่หมดอายุ ส่งน้ำยางแทนสมาชิกคนนี้
// ให้สมาชิกรู้ว่าใครมีสิทธิ์ขายแทน และแบ่งรายได้เท่าไร
export async function getMemberEmployeeInfo(memberId) {
  const pairs = await prisma.mePair.findMany({
    where: { memberId, status: "Active" },
    select: {
      memberShare: true,
      employeeShare: true,
      contractEndDate: true,
      employee: {
        select: { employeeCode: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { contractStartDate: "desc" },
  });

  const now = new Date();
  return pairs
    .filter((pair) => !pair.contractEndDate || pair.contractEndDate > now)
    .map((pair) => ({
      employeeCode: pair.employee.employeeCode,
      firstName: pair.employee.firstName,
      lastName: pair.employee.lastName,
      phone: pair.employee.phone,
      memberShare: pair.memberShare.toNumber(),
      employeeShare: pair.employeeShare.toNumber(),
    }));
}

// ประวัติการเงินของสมาชิก — เงินในกระเป๋าเปลี่ยนได้ 3 ทาง:
//   ขายน้ำยาง (+), ได้ปันผล (+), เบิกเงิน (−)
// รวมทั้งสามแหล่งเป็นรายการเดียว (amount มีเครื่องหมาย + / −) เรียงวันที่ใหม่สุดก่อน
export async function getMemberFinanceHistory(memberId) {
  const [purchases, withdrawals, dividends] = await Promise.all([
    prisma.purchase.findMany({
      where: { memberId },
      select: {
        id: true,
        purchaseCode: true,
        recordDate: true,
        ownerPayout: true,
        totalAmount: true,
        sellerType: true,
        deliveredByName: true,
        employeePayout: true,
        rawWeightKg: true,
        dryPercentage: true,
        marketPrice: true,
        createdAt: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { memberId },
      select: {
        id: true,
        withdrawalCode: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,
      },
    }),
    prisma.dividendPayment.findMany({
      where: { memberId },
      select: {
        id: true,
        dividendCode: true,
        amount: true,
        buddhistYear: true,
        periodLabel: true,
        rate: true,
        dryWeightKg: true,
        createdAt: true,
      },
    }),
  ]);

  const rows = [
    ...purchases.map((purchase) => {
      // แสดงส่วนแบ่งของลูกจ้างเฉพาะรายการที่ลูกจ้างเป็นผู้ส่งและได้รับเงินจริง
      // (ถ้าสมาชิกขายเอง จะไม่มีบรรทัดนี้)
      const employeeDelivered =
        purchase.sellerType === "EMPLOYEE" &&
        purchase.employeePayout.toNumber() > 0;
      return {
        id: purchase.id,
        date: utcDateKey(purchase.recordDate),
        type: "PURCHASE",
        code: purchase.purchaseCode,
        amount: purchase.ownerPayout.toNumber(),
        recordedAt: purchase.createdAt.toISOString(),
        deliveredByName: employeeDelivered
          ? purchase.deliveredByName
          : undefined,
        employeePayout: employeeDelivered
          ? purchase.employeePayout.toNumber()
          : undefined,
        totalAmount: purchase.totalAmount.toNumber(),
        rawWeightKg: purchase.rawWeightKg.toNumber(),
        dryPercentage: purchase.dryPercentage.toNumber(),
        marketPrice: purchase.marketPrice.toNumber(),
      };
    }),
    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      // การเบิกไม่มีวันทำการแยก — ใช้วันที่ทำรายการจริง (ตามเวลาไทย)
      date: bangkokDateKey(withdrawal.createdAt),
      type: "WITHDRAWAL",
      code: withdrawal.withdrawalCode,
      amount: -withdrawal.amount.toNumber(),
      recordedAt: withdrawal.createdAt.toISOString(),
      balanceAfter: withdrawal.balanceAfter.toNumber(),
    })),
    ...dividends.map((dividend) => ({
      id: dividend.id,
      // ปันผลเกิดขึ้นทันทีที่พนักงานกดยืนยันการจ่าย
      date: bangkokDateKey(dividend.createdAt),
      type: "DIVIDEND",
      code: dividend.dividendCode,
      amount: dividend.amount.toNumber(),
      recordedAt: dividend.createdAt.toISOString(),
      buddhistYear: dividend.buddhistYear,
      periodLabel: dividend.periodLabel,
      rate: dividend.rate.toNumber(),
      dryWeightKg: dividend.dryWeightKg.toNumber(),
    })),
  ];

  return rows
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt)
    )
    .map((row) => {
      // recordedAt ใช้แค่จัดลำดับรายการวันเดียวกัน ไม่ต้องส่งออกไป
      const entry = { ...row };
      delete entry.recordedAt;
      return entry;
    });
}

// รายการแจ้งเตือนล่าสุดสำหรับกระดิ่งบนแถบด้านบน
// ใช้ข้อมูล 3 แหล่งเดียวกับประวัติการเงิน แต่เรียงตาม "เวลาที่บันทึกจริง"
// เพื่อให้รายการที่เพิ่งบันทึกขึ้นมาอยู่บนสุดเสมอ (สูงสุด limit รายการ)
export async function getMemberNotifications(memberId, limit = 20) {
  const [purchases, withdrawals, dividends] = await Promise.all([
    prisma.purchase.findMany({
      where: { memberId },
      select: { id: true, purchaseCode: true, ownerPayout: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.withdrawal.findMany({
      where: { memberId },
      select: { id: true, withdrawalCode: true, amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.dividendPayment.findMany({
      where: { memberId },
      select: { id: true, dividendCode: true, amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const notifications = [
    ...purchases.map((purchase) => ({
      id: purchase.id,
      type: "PURCHASE",
      code: purchase.purchaseCode,
      amount: purchase.ownerPayout.toNumber(),
      occurredAt: purchase.createdAt.toISOString(),
    })),
    ...withdrawals.map((withdrawal) => ({
      id: withdrawal.id,
      type: "WITHDRAWAL",
      code: withdrawal.withdrawalCode,
      amount: withdrawal.amount.toNumber(),
      occurredAt: withdrawal.createdAt.toISOString(),
    })),
    ...dividends.map((dividend) => ({
      id: dividend.id,
      type: "DIVIDEND",
      code: dividend.dividendCode,
      amount: dividend.amount.toNumber(),
      occurredAt: dividend.createdAt.toISOString(),
    })),
  ];

  return notifications
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

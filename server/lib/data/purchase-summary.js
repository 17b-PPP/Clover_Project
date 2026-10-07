// =============================================================================
// server/lib/data/purchase-summary.js
// -----------------------------------------------------------------------------
// ข้อมูลสำหรับหน้า "ผลประกอบการการรับซื้อน้ำยางสด"
//
// สหกรณ์มีรายการรับซื้อปีละไม่กี่ร้อยรายการ จึงดึงประวัติทั้งหมดครั้งเดียว
// แล้วให้หน้าเว็บคำนวณการ์ดสรุปและตารางตามช่วงวันที่ที่ผู้ใช้เลือกเอง
// แต่ละแถวมีชื่อ/รหัสสมาชิกผู้ขาย และข้อมูลที่ใช้แสดงใบเสร็จได้ด้วย
// =============================================================================

import { prisma } from "../prisma.js";

export async function getPurchaseSummaryRows() {
  const purchases = await prisma.purchase.findMany({
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      purchaseCode: true,
      recordDate: true,
      createdAt: true,
      rawWeightKg: true,
      dryPercentage: true,
      dryWeightKg: true,
      marketPrice: true,
      totalAmount: true,
      sellerCode: true,
      deliveredByName: true,
      ownerName: true,
      employeePayout: true,
      ownerPayout: true,
      member: {
        select: { memberCode: true, firstName: true, lastName: true },
      },
    },
  });

  return purchases.map((purchase) => ({
    id: purchase.id,
    purchaseCode: purchase.purchaseCode,
    recordDate: purchase.recordDate.toISOString(), // วันทำการ (เที่ยงคืน UTC)
    createdAt: purchase.createdAt.toISOString(), // เวลาที่บันทึกบิลจริง
    memberCode: purchase.member.memberCode,
    memberName: `${purchase.member.firstName} ${purchase.member.lastName}`,
    rawWeightKg: purchase.rawWeightKg.toNumber(),
    dryPercentage: purchase.dryPercentage.toNumber(),
    dryWeightKg: purchase.dryWeightKg.toNumber(),
    marketPrice: purchase.marketPrice.toNumber(),
    totalAmount: purchase.totalAmount.toNumber(),
    sellerCode: purchase.sellerCode,
    deliveredByName: purchase.deliveredByName,
    ownerName: purchase.ownerName,
    employeePayout: purchase.employeePayout.toNumber(),
    ownerPayout: purchase.ownerPayout.toNumber(),
  }));
}

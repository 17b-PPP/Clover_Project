// =============================================================================
// server/lib/data/purchases.js
// -----------------------------------------------------------------------------
// ฟังก์ชันจัดการ "การรับซื้อน้ำยาง" (ตาราง Purchase)
//
// สูตรคำนวณ:
//   น้ำหนักยางแห้ง (dryWeightKg) = น้ำหนักน้ำยางสด × %เนื้อยางแห้ง / 100
//   จำนวนเงินรวม  (totalAmount) = น้ำหนักยางแห้ง × ราคากลาง
//   ส่วนของลูกจ้าง (employeePayout) = จำนวนเงินรวม × %ลูกจ้าง (ปัดทศนิยม 2 ตำแหน่ง)
//   ส่วนของเจ้าของสวน (ownerPayout) = จำนวนเงินรวม − ส่วนของลูกจ้าง
//     → บวกเข้า "ยอดเงินสะสม" (walletBalance) ของสมาชิก
// =============================================================================

import { prisma } from "../prisma.js";

// แปลงแถว Purchase เป็นข้อมูลที่ส่งให้หน้าเว็บ
function serialize(purchase) {
  return {
    id: purchase.id,
    purchaseCode: purchase.purchaseCode,
    recordDate: purchase.recordDate.toISOString(),
    marketPrice: purchase.marketPrice.toNumber(),
    sellerCode: purchase.sellerCode,
    sellerType: purchase.sellerType,
    ownerName: purchase.ownerName,
    deliveredByName: purchase.deliveredByName,
    rawWeightKg: purchase.rawWeightKg.toNumber(),
    dryPercentage: purchase.dryPercentage.toNumber(),
    dryWeightKg: purchase.dryWeightKg.toNumber(),
    totalAmount: purchase.totalAmount.toNumber(),
    employeePayout: purchase.employeePayout.toNumber(),
    ownerPayout: purchase.ownerPayout.toNumber(),
    createdAt: purchase.createdAt.toISOString(),
    memberId: purchase.memberId,
    employeeId: purchase.employeeId,
  };
}

// สร้างเลขที่รายการรับซื้อถัดไป เช่น P-0099 → P-0100
async function nextPurchaseCode() {
  const last = await prisma.purchase.findFirst({
    orderBy: { purchaseCode: "desc" },
    select: { purchaseCode: true },
  });
  const n = last ? parseInt(last.purchaseCode.replace("P-", ""), 10) : 0;
  return `P-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

// error เฉพาะของการค้นหาผู้ขาย (API จะตอบข้อความนี้กลับไปให้ผู้ใช้เห็น)
export class SellerLookupError extends Error {}

// ค้นหาผู้ขายจากรหัส (รหัสสมาชิก M-xxxx หรือรหัสลูกจ้าง E-xxxx)
//
// - ถ้าเป็นสมาชิก: สมาชิกขายเอง ได้เงิน 100%
// - ถ้าเป็นลูกจ้าง: หาสัญญาจ้างที่ใช้งานอยู่ เพื่อรู้ว่าส่งน้ำยางแทนเจ้าของสวนคนไหน
//   และแบ่งรายได้เท่าไร (ลูกจ้างหนึ่งคนอาจมีเจ้าของสวนได้หลายคน)
//   preferredMemberId = เจ้าของสวนที่ผู้ใช้เลือกไว้ (ถ้ามีหลายคน)
export async function lookupSeller(code, preferredMemberId) {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new SellerLookupError("กรุณากรอกรหัสสมาชิกหรือรหัสลูกจ้าง");
  }

  // ปรับรูปแบบรหัสให้ยืดหยุ่น เช่น m-0001 -> M-0001, m0001 -> M-0001, 1 -> M-0001
  const upper = trimmed.toUpperCase();
  const normalizedM = upper.replace(/^M-?(\d+)$/, (_, num) => `M-${num.padStart(4, "0")}`);
  const normalizedE = upper.replace(/^E-?(\d+)$/, (_, num) => `E-${num.padStart(4, "0")}`);
  const pureNum = /^\d+$/.test(trimmed) ? trimmed.padStart(4, "0") : null;

  const candidateMemberCodes = [
    trimmed,
    upper,
    normalizedM,
    pureNum ? `M-${pureNum}` : null,
  ].filter(Boolean);

  const candidateEmployeeCodes = [
    trimmed,
    upper,
    normalizedE,
    pureNum ? `E-${pureNum}` : null,
  ].filter(Boolean);

  // 1) ลองหาเป็นรหัสสมาชิกก่อน
  const member = await prisma.member.findFirst({
    where: {
      OR: candidateMemberCodes.map((c) => ({
        memberCode: { equals: c, mode: "insensitive" },
      })),
    },
  });
  if (member) {
    if (member.status !== "Active") {
      throw new SellerLookupError("สมาชิกรายนี้ถูกระงับการใช้งาน");
    }
    const fullName = `${member.firstName} ${member.lastName}`;
    return {
      sellerCode: member.memberCode,
      sellerType: "MEMBER",
      memberId: member.id,
      employeeId: null,
      ownerName: fullName,
      deliveredByName: fullName,
      memberShare: 100,
      employeeShare: 0,
      ownerOptions: [
        { memberId: member.id, ownerName: fullName, memberShare: 100, employeeShare: 0 },
      ],
    };
  }

  // 2) ถ้าไม่ใช่สมาชิก ลองหาเป็นรหัสลูกจ้าง
  const employee = await prisma.employee.findFirst({
    where: {
      OR: candidateEmployeeCodes.map((c) => ({
        employeeCode: { equals: c, mode: "insensitive" },
      })),
    },
  });
  if (employee) {
    if (employee.status !== "Active") {
      throw new SellerLookupError("ลูกจ้างรายนี้ถูกระงับการใช้งาน");
    }
    // สัญญาที่ยังใช้งานอยู่ของลูกจ้างคนนี้ (ใหม่สุดก่อน)
    const pairs = await prisma.mePair.findMany({
      where: {
        employeeId: employee.id,
        status: "Active",
        contractEndDate: null,
      },
      include: { member: true },
      orderBy: { contractStartDate: "desc" },
    });
    // เลือกเฉพาะสัญญาที่เจ้าของสวนยังใช้งานอยู่
    const activeOwnerPairs = pairs.filter((p) => p.member.status === "Active");
    if (pairs.length === 0) {
      throw new SellerLookupError("ลูกจ้างรายนี้ไม่มีสัญญาจ้างที่ยังใช้งานอยู่");
    }
    if (activeOwnerPairs.length === 0) {
      throw new SellerLookupError("เจ้าของสวนของลูกจ้างรายนี้ถูกระงับการใช้งาน");
    }

    const selected = preferredMemberId
      ? activeOwnerPairs.find((p) => p.memberId === preferredMemberId)
      : activeOwnerPairs[0];
    if (!selected) {
      throw new SellerLookupError("เจ้าของสวนที่เลือกไม่ถูกต้องหรือไม่พร้อมใช้งานแล้ว");
    }

    return {
      sellerCode: employee.employeeCode,
      sellerType: "EMPLOYEE",
      memberId: selected.member.id,
      employeeId: employee.id,
      ownerName: `${selected.member.firstName} ${selected.member.lastName}`,
      deliveredByName: `${employee.firstName} ${employee.lastName}`,
      memberShare: selected.memberShare.toNumber(),
      employeeShare: selected.employeeShare.toNumber(),
      ownerOptions: activeOwnerPairs.map((p) => ({
        memberId: p.member.id,
        ownerName: `${p.member.firstName} ${p.member.lastName}`,
        memberShare: p.memberShare.toNumber(),
        employeeShare: p.employeeShare.toNumber(),
      })),
    };
  }

  throw new SellerLookupError("ไม่พบรหัสสมาชิกหรือรหัสลูกจ้างนี้ในระบบ");
}

// รายการรับซื้อทั้งหมด (ใหม่สุดก่อน)
export async function getPurchases() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
  });
  return purchases.map(serialize);
}

// ประวัติการขายของสมาชิก 1 คน (ใหม่สุดก่อน)
// limit = จำนวนรายการล่าสุดที่ต้องการ (ไม่ใส่ = ทั้งหมด)
export async function getPurchaseHistoryForMember(memberId, limit) {
  const purchases = await prisma.purchase.findMany({
    where: { memberId },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
  return purchases.map(serialize);
}

// บันทึกการรับซื้อใหม่
// ทำ 2 อย่างพร้อมกันใน transaction เดียว (สำเร็จทั้งคู่หรือไม่บันทึกเลย):
//   1. เพิ่มแถวการรับซื้อ
//   2. บวกส่วนของเจ้าของสวนเข้ายอดเงินสะสมของสมาชิก
export async function createPurchase(input) {
  const seller = await lookupSeller(input.sellerCode, input.memberId);
  const dryWeightKg = (input.rawWeightKg * input.dryPercentage) / 100;
  const totalAmount = dryWeightKg * input.marketPrice;

  // ส่วนของลูกจ้างจ่ายเป็นเงินสดทันที (ไม่สะสมในระบบ)
  // ส่วนของเจ้าของสวนคำนวณจาก "ส่วนที่เหลือ" เพื่อให้สองส่วนรวมกันได้ยอดเต็มพอดี
  const employeePayout =
    Math.round(totalAmount * (seller.employeeShare / 100) * 100) / 100;
  const ownerPayout = Math.round((totalAmount - employeePayout) * 100) / 100;

  const purchaseCode = await nextPurchaseCode();
  const [purchase] = await prisma.$transaction([
    prisma.purchase.create({
      data: {
        purchaseCode,
        recordDate: new Date(input.recordDate),
        marketPrice: input.marketPrice,
        sellerCode: seller.sellerCode,
        sellerType: seller.sellerType,
        ownerName: seller.ownerName,
        deliveredByName: seller.deliveredByName,
        rawWeightKg: input.rawWeightKg,
        dryPercentage: input.dryPercentage,
        dryWeightKg,
        totalAmount,
        employeePayout,
        ownerPayout,
        memberId: seller.memberId,
        employeeId: seller.employeeId,
      },
    }),
    prisma.member.update({
      where: { id: seller.memberId },
      data: { walletBalance: { increment: ownerPayout } },
    }),
  ]);
  return serialize(purchase);
}

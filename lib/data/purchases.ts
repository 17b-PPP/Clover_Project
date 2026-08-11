import { prisma } from "@/lib/prisma";
import type { Purchase as PrismaPurchase } from "@prisma/client";
import type { Purchase, PurchaseInput, SellerLookup } from "@/lib/types";

function serialize(purchase: PrismaPurchase): Purchase {
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

async function nextPurchaseCode(): Promise<string> {
  const last = await prisma.purchase.findFirst({
    orderBy: { purchaseCode: "desc" },
    select: { purchaseCode: true },
  });
  const n = last ? parseInt(last.purchaseCode.replace("P-", ""), 10) : 0;
  return `P-${String((Number.isNaN(n) ? 0 : n) + 1).padStart(4, "0")}`;
}

export class SellerLookupError extends Error {}

export async function lookupSeller(code: string): Promise<SellerLookup> {
  const trimmed = code.trim();

  const member = await prisma.member.findUnique({
    where: { memberCode: trimmed },
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
    };
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeCode: trimmed },
  });
  if (employee) {
    if (employee.status !== "Active") {
      throw new SellerLookupError("ลูกจ้างรายนี้ถูกระงับการใช้งาน");
    }
    const pair = await prisma.mePair.findFirst({
      where: { employeeId: employee.id, status: "Active" },
      include: { member: true },
      orderBy: { contractStartDate: "desc" },
    });
    if (!pair) {
      throw new SellerLookupError("ลูกจ้างรายนี้ไม่มีสัญญาจ้างที่ยังใช้งานอยู่");
    }
    if (pair.member.status !== "Active") {
      throw new SellerLookupError("เจ้าของสวนของลูกจ้างรายนี้ถูกระงับการใช้งาน");
    }
    return {
      sellerCode: employee.employeeCode,
      sellerType: "EMPLOYEE",
      memberId: pair.member.id,
      employeeId: employee.id,
      ownerName: `${pair.member.firstName} ${pair.member.lastName}`,
      deliveredByName: `${employee.firstName} ${employee.lastName}`,
      memberShare: pair.memberShare.toNumber(),
      employeeShare: pair.employeeShare.toNumber(),
    };
  }

  throw new SellerLookupError("ไม่พบรหัสสมาชิกหรือรหัสลูกจ้างนี้ในระบบ");
}

export async function getPurchases(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
  });
  return purchases.map(serialize);
}

export async function getPurchaseHistory(): Promise<Purchase[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return purchases.map(serialize);
}

export async function createPurchase(
  input: PurchaseInput
): Promise<Purchase> {
  const seller = await lookupSeller(input.sellerCode);
  const dryWeightKg = (input.rawWeightKg * input.dryPercentage) / 100;
  const totalAmount = dryWeightKg * input.marketPrice;

  // Employee's share is paid out on the spot (not tracked in the DB);
  // the owner's share is credited to their wallet, so it's computed as
  // the remainder to guarantee the two payouts always sum to totalAmount.
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

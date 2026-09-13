import { prisma } from "@/lib/prisma";
import type { ReferencePrice as PrismaReferencePrice } from "@prisma/client";
import type { ReferencePriceEntry } from "@/lib/types";

function serialize(row: PrismaReferencePrice): ReferencePriceEntry {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getReferencePriceHistory(): Promise<ReferencePriceEntry[]> {
  const rows = await prisma.referencePrice.findMany({
    orderBy: { date: "desc" },
  });
  return rows.map(serialize);
}

export async function getReferencePriceForDate(
  dateIso: string
): Promise<ReferencePriceEntry | null> {
  const row = await prisma.referencePrice.findUnique({
    where: { date: new Date(dateIso) },
  });
  return row ? serialize(row) : null;
}

export async function upsertReferencePrice(
  dateIso: string,
  price: number
): Promise<ReferencePriceEntry> {
  const date = new Date(dateIso);
  const row = await prisma.referencePrice.upsert({
    where: { date },
    create: { date, price },
    update: { price },
  });
  return serialize(row);
}

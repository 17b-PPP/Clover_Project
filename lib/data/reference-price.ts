import { prisma } from "@/lib/prisma";
import type {
  ReferencePrice as PrismaReferencePrice,
  ReferencePriceHistory as PrismaReferencePriceHistory,
} from "@prisma/client";
import type { ReferencePriceEntry, ReferencePriceLogEntry } from "@/lib/types";

function serialize(row: PrismaReferencePrice): ReferencePriceEntry {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeLog(row: PrismaReferencePriceHistory): ReferencePriceLogEntry {
  return {
    id: row.id,
    date: row.date.toISOString(),
    price: row.price.toNumber(),
    recordedAt: row.recordedAt.toISOString(),
  };
}

export async function getReferencePriceHistory(): Promise<ReferencePriceEntry[]> {
  const rows = await prisma.referencePrice.findMany({
    orderBy: { date: "desc" },
  });
  return rows.map(serialize);
}

// Every save action ever made against a reference price, newest first —
// unlike ReferencePrice (one row per day, latest value only), this keeps
// every value a day has ever been set to. The page paginates it client-side.
export async function getReferencePriceLog(): Promise<ReferencePriceLogEntry[]> {
  const rows = await prisma.referencePriceHistory.findMany({
    orderBy: { recordedAt: "desc" },
  });
  return rows.map(serializeLog);
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
): Promise<{ entry: ReferencePriceEntry; log: ReferencePriceLogEntry }> {
  const date = new Date(dateIso);
  const [row, logRow] = await prisma.$transaction([
    prisma.referencePrice.upsert({
      where: { date },
      create: { date, price },
      update: { price },
    }),
    prisma.referencePriceHistory.create({
      data: { date, price },
    }),
  ]);
  return { entry: serialize(row), log: serializeLog(logRow) };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThaiDateField } from "@/components/purchases/ThaiDateField";
import { LiveClock } from "@/components/purchases/LiveClock";
import { PurchaseReceipt } from "@/components/purchases/PurchaseReceipt";
import { useSellerLookup } from "@/components/hooks/useSellerLookup";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Purchase } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const LOCKED_PRICE_STORAGE_KEY = "purchases:lockedMarketPrice";

export function PurchasesPageClient() {
  const [recordDate] = useState(todayIso());
  const [marketPrice, setMarketPrice] = useState("");
  const [priceLocked, setPriceLocked] = useState(false);
  const [sellerCode, setSellerCode] = useState("");
  const [rawWeightKg, setRawWeightKg] = useState("");
  const [dryPercentage, setDryPercentage] = useState("");

  const [saved, setSaved] = useState<Purchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const seller = useSellerLookup(sellerCode);
  const locked = saved !== null;

  const [priceHydrated, setPriceHydrated] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(LOCKED_PRICE_STORAGE_KEY);
        if (raw) {
          setMarketPrice(raw);
          setPriceLocked(true);
        }
      } catch {
        // localStorage unavailable — ignore
      }
      setPriceHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!priceHydrated) return;
    try {
      if (priceLocked) {
        localStorage.setItem(LOCKED_PRICE_STORAGE_KEY, marketPrice);
      } else {
        localStorage.removeItem(LOCKED_PRICE_STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, [priceHydrated, priceLocked, marketPrice]);

  const dryWeightKg = useMemo(() => {
    const raw = Number(rawWeightKg);
    const pct = Number(dryPercentage);
    if (!raw || !pct) return 0;
    return (raw * pct) / 100;
  }, [rawWeightKg, dryPercentage]);

  const totalAmount = useMemo(() => {
    const price = Number(marketPrice);
    if (!price || !dryWeightKg) return 0;
    return dryWeightKg * price;
  }, [marketPrice, dryWeightKg]);

  function resetForm() {
    if (!priceLocked) setMarketPrice("");
    setSellerCode("");
    setRawWeightKg("");
    setDryPercentage("");
    setSaved(null);
    setFormError(null);
  }

  function openConfirm() {
    setFormError(null);

    if (!seller.data) {
      setFormError("กรุณากรอกรหัสสมาชิกหรือรหัสลูกจ้างที่ถูกต้อง");
      return;
    }
    const price = Number(marketPrice);
    const raw = Number(rawWeightKg);
    const pct = Number(dryPercentage);
    if (!price || price <= 0) {
      setFormError("กรุณากรอกราคากลางประจำวัน");
      return;
    }
    if (!raw || raw <= 0) {
      setFormError("กรุณากรอกน้ำหนักน้ำยางสดสุทธิ");
      return;
    }
    if (!pct || pct <= 0 || pct > 100) {
      setFormError("กรุณากรอกเนื้อยางแห้งให้ถูกต้อง (0-100%)");
      return;
    }

    setConfirmOpen(true);
  }

  async function submitPurchase() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordDate,
          marketPrice: Number(marketPrice),
          sellerCode,
          rawWeightKg: Number(rawWeightKg),
          dryPercentage: Number(dryPercentage),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกรายการรับซื้อได้");
      }
      setSaved(data as Purchase);
      setPriceLocked(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <PageHeader
        title="ระบบรับซื้อน้ำยาง"
        description="บันทึกข้อมูลการรับซื้อน้ำยางพารา คำนวณจำนวนเงิน และพิมพ์ใบเสร็จ"
        action={<LiveClock />}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <ThaiDateField label="วันที่บันทึก" value={recordDate} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              ราคากลางประจำวัน
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-600">
              <span className="text-xs font-medium text-emerald-700">
                THB/KG
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={marketPrice}
                disabled={priceLocked || locked}
                onChange={(e) => setMarketPrice(e.target.value)}
                placeholder="0.0"
                className="w-full border-none bg-transparent p-0 text-right text-sm font-semibold text-emerald-800 focus:outline-none focus:ring-0 disabled:text-emerald-700"
              />
              <button
                type="button"
                onClick={() => setPriceLocked((v) => !v)}
                aria-label={priceLocked ? "ปลดล็อกราคา" : "ล็อกราคา"}
                title={
                  priceLocked
                    ? "ราคาถูกล็อกไว้ กดเพื่อปลดล็อกและเปลี่ยนค่าใหม่"
                    : "กดเพื่อล็อกราคานี้ไว้"
                }
                className="shrink-0 rounded p-0.5 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {priceLocked ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 7.4-2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              เลขที่สมาชิก
            </label>
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-600 ${
                seller.error ? "border-red-400" : "border-slate-300"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="h-4 w-4 shrink-0 text-slate-400"
              >
                <path d="M12 11a3 3 0 0 0-3 3v1M12 11a3 3 0 0 1 3 3v1M12 4a7 7 0 0 0-7 7v3a9 9 0 0 0 4 7.5M12 4a7 7 0 0 1 7 7v3a9 9 0 0 1-4 7.5M12 11v9" />
              </svg>
              <input
                type="text"
                value={sellerCode}
                disabled={locked}
                onChange={(e) => setSellerCode(e.target.value)}
                placeholder="เช่น M-0001 หรือ E-0001"
                className="w-full border-none bg-transparent p-0 text-sm text-slate-900 focus:outline-none focus:ring-0"
              />
            </div>
            {seller.loading && (
              <span className="text-xs text-slate-400">กำลังค้นหา...</span>
            )}
            {seller.error && (
              <span className="text-xs text-red-600">{seller.error}</span>
            )}
          </div>

          <Input
            label="เจ้าของสวน"
            value={seller.data?.ownerName ?? ""}
            readOnly
            disabled
            placeholder="ระบบจะแสดงให้อัตโนมัติ"
          />

          <div className="col-span-2">
            <Input
              label="รับน้ำยางจาก"
              value={seller.data?.deliveredByName ?? ""}
              readOnly
              disabled
              placeholder="ระบบจะแสดงให้อัตโนมัติ"
            />
          </div>

          <Input
            label="น้ำหนักน้ำยางสดสุทธิ (กก.)"
            type="number"
            min={0}
            step="0.01"
            value={rawWeightKg}
            disabled={locked}
            onChange={(e) => setRawWeightKg(e.target.value)}
            placeholder="0.00"
          />

          <Input
            label="% เนื้อยางแห้ง"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={dryPercentage}
            disabled={locked}
            onChange={(e) => setDryPercentage(e.target.value)}
            placeholder="0.00"
          />

          <Input
            label="น้ำหนักยางแห้งสุทธิ (กก.)"
            value={dryWeightKg ? dryWeightKg.toFixed(2) : ""}
            readOnly
            disabled
            placeholder="0.00"
          />

          <div className="flex items-end">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={locked || submitting}
              onClick={openConfirm}
            >
              {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </div>
        </div>

        {formError && (
          <p className="mt-4 text-sm text-red-600">{formError}</p>
        )}

        <div className="mt-8 flex items-center justify-between gap-6 border-t border-slate-200 pt-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              จำนวนเงินรวม
            </p>
            <p className="text-3xl font-bold text-emerald-700">
              {totalAmount ? totalAmount.toFixed(2) : "0.00"}{" "}
              <span className="text-base font-medium text-slate-400">บาท</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={resetForm}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!locked}
              onClick={handlePrint}
            >
              พิมพ์ใบเสร็จ
            </Button>
          </div>
        </div>
      </div>

      {saved && <PurchaseReceipt purchase={saved} />}

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันการทำรายการ"
        message="ต้องการบันทึกรายการรับซื้อน้ำยางนี้ใช่หรือไม่?"
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitPurchase}
      />
    </div>
  );
}

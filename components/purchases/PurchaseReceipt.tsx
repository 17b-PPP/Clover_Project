import type { Purchase } from "@/lib/types";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

interface PurchaseReceiptProps {
  purchase: Purchase;
}

export function PurchaseReceipt({ purchase }: PurchaseReceiptProps) {
  return (
    <div id="purchase-receipt" className="hidden print:block">
      <div className="mx-auto max-w-md p-8 text-slate-900">
        <h1 className="text-center text-lg font-semibold">ใบเสร็จรับซื้อน้ำยางพารา</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          เลขที่ {purchase.purchaseCode}
        </p>

        <div className="mt-6 space-y-2 text-sm">
          <Row label="วันที่บันทึก" value={formatThaiDate(purchase.recordDate)} />
          <Row label="รหัสที่ใช้บันทึก" value={purchase.sellerCode} />
          <Row label="เจ้าของสวน" value={purchase.ownerName} />
          <Row label="รับน้ำยางจาก" value={purchase.deliveredByName} />
          <Row
            label="ราคากลางประจำวัน"
            value={`${purchase.marketPrice.toFixed(2)} บาท/กก.`}
          />
          <Row
            label="น้ำหนักน้ำยางสดสุทธิ"
            value={`${purchase.rawWeightKg.toFixed(2)} กก.`}
          />
          <Row label="เนื้อยางแห้ง" value={`${purchase.dryPercentage.toFixed(2)} %`} />
          <Row
            label="น้ำหนักยางแห้งสุทธิ"
            value={`${purchase.dryWeightKg.toFixed(2)} กก.`}
          />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-300 pt-4">
          <span className="text-base font-semibold">จำนวนเงินรวม</span>
          <span className="text-xl font-bold">
            {purchase.totalAmount.toFixed(2)} บาท
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

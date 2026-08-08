import type { Purchase } from "@/lib/types";

const ORG_NAME = "สหกรณ์กองทุนสวนยางบ้านบางบอนจำกัด";

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function receiptNumber(purchaseCode: string): string {
  return String(parseInt(purchaseCode.replace("P-", ""), 10) || 0);
}

interface PurchaseReceiptProps {
  purchase: Purchase;
}

export function PurchaseReceipt({ purchase }: PurchaseReceiptProps) {
  return (
    <div id="purchase-receipt" className="hidden print:block">
      <div className="relative mx-auto max-w-lg rounded-2xl border border-slate-200 p-10 text-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M21 8 12 3 3 8l9 5 9-5Z" />
              <path d="M3 8v8l9 5 9-5V8M12 13v8" />
            </svg>
          </div>
          <h1 className="mt-3 text-base font-semibold">{ORG_NAME}</h1>
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            ใบเสร็จรับเงิน
          </p>
          <p className="text-xs tracking-wide text-slate-400">
            OFFICIAL_PURCHASE_RECEIPT
          </p>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
          <div className="flex items-start justify-between">
            <span>
              เลขที่สมาชิก:{" "}
              <span className="font-medium text-emerald-700">
                {purchase.sellerCode}
              </span>
            </span>
            <span>เลขที่: {receiptNumber(purchase.purchaseCode)}</span>
          </div>
          <div className="flex items-start justify-between">
            <span>ผู้ส่งน้ำยาง: {purchase.deliveredByName}</span>
            <span className="text-right">เจ้าของสวน: {purchase.ownerName}</span>
          </div>
          <div className="flex items-start justify-between">
            <span>วันที่: {formatThaiDate(purchase.recordDate)}</span>
            <span>เวลา: {formatTime(purchase.createdAt)}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">น้ำหนักน้ำยางสดสุทธิ</p>
            <p className="mt-1 font-semibold">
              {purchase.rawWeightKg.toFixed(0)} กก.
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">% เนื้อยาง</p>
            <p className="mt-1 font-semibold">
              {purchase.dryPercentage.toFixed(0)} %
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">น้ำหนักยางแห้งสุทธิ</span>
          <span className="font-semibold text-emerald-700">
            {purchase.dryWeightKg.toFixed(1)} กก.
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-300 pt-4">
          <span className="text-base font-semibold">จำนวนเงินรวม</span>
          <span className="text-xl font-bold text-emerald-700">
            {purchase.totalAmount.toFixed(0)} ฿
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">ลูกจ้าง (จ่ายแล้ว)</p>
            <p className="mt-1 font-semibold">
              {purchase.employeePayout.toFixed(0)} ฿
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">เจ้าของสวน (สะสม)</p>
            <p className="mt-1 font-semibold">
              {purchase.ownerPayout.toFixed(0)} ฿
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          <div>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">
              ผู้ส่งน้ำยาง/ผู้รับเงิน
            </div>
          </div>
          <div>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">ผู้จ่ายเงิน</div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

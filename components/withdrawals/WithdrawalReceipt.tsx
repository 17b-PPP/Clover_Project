import type { Withdrawal } from "@/lib/types";

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
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function receiptNumber(withdrawalCode: string): string {
  return String(parseInt(withdrawalCode.replace("W-", ""), 10) || 0);
}

interface WithdrawalReceiptProps {
  withdrawal: Withdrawal;
}

export function WithdrawalReceipt({ withdrawal }: WithdrawalReceiptProps) {
  return (
    <div className="receipt-print-area hidden print:block">
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
            ใบเสร็จเบิกเงิน
          </p>
          <p className="text-xs tracking-wide text-slate-400">
            OFFICIAL_WITHDRAWAL_RECEIPT
          </p>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
          <div className="flex items-start justify-between">
            <span>
              เลขที่สมาชิก:{" "}
              <span className="font-medium text-emerald-700">
                {withdrawal.memberCode}
              </span>
            </span>
            <span>เลขที่: {receiptNumber(withdrawal.withdrawalCode)}</span>
          </div>
          <div className="flex items-start justify-between">
            <span>ชื่อสมาชิก: {withdrawal.memberName}</span>
            <span className="text-right">
              วันที่: {formatThaiDate(withdrawal.createdAt)} เวลา:{" "}
              {formatTime(withdrawal.createdAt)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">ยอดเงินสะสมก่อนเบิก</p>
            <p className="mt-1 font-semibold">
              {withdrawal.balanceBefore.toFixed(2)} ฿
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">ยอดคงเหลือหลังเบิก</p>
            <p className="mt-1 font-semibold">
              {withdrawal.balanceAfter.toFixed(2)} ฿
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-300 pt-4">
          <span className="text-base font-semibold">จำนวนเงินที่เบิก</span>
          <span className="text-xl font-bold text-emerald-700">
            {withdrawal.amount.toFixed(2)} ฿
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          <div>
            <div className="h-16" />
            <div className="border-t border-slate-300 pt-2">
              ผู้เบิกเงิน/ผู้รับเงิน
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

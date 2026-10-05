import { formatNumber } from "@/lib/format";

interface WalletCardProps {
  balance: number;
  monthlyEarnings: number;
}

export function WalletCard({ balance, monthlyEarnings }: WalletCardProps) {
  return (
    <div className="rounded-xl bg-emerald-700 p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
          กระเป๋าเงินของฉัน (บาท)
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/60">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5ZM3 7.5 15 4M16 13h1.5" />
          </svg>
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {formatNumber(balance)}
      </p>
      <div className="mt-4 border-t border-emerald-600/40 pt-3">
        <p className="text-[11px] text-emerald-100">เดือนนี้ได้เงิน (บาท)</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums">
          {formatNumber(monthlyEarnings)}
        </p>
      </div>
    </div>
  );
}

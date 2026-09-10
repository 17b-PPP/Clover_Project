import { formatCurrency, formatDateTimeThai, formatDateUtc } from "@/lib/format";
import type { DailyMarketPrice } from "@/lib/types";

interface MemberTopbarProps {
  firstName: string;
  lastName: string;
  // ISO instant the page's data was read from the database.
  fetchedAt: string;
  marketPrice: DailyMarketPrice | null;
}

export function MemberTopbar({
  firstName,
  lastName,
  fetchedAt,
  marketPrice,
}: MemberTopbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            สวัสดี คุณ{firstName} {lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ข้อมูลล่าสุด ณ {formatDateTimeThai(fetchedAt)} น.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            ราคากลางน้ำยางประจำวัน
          </p>
          {marketPrice ? (
            <>
              <p className="text-lg font-semibold tabular-nums text-emerald-800">
                {formatCurrency(marketPrice.price)}
                <span className="ml-1 text-xs font-medium"> / กก.</span>
              </p>
              <p className="text-xs text-emerald-700">
                ประจำวันที่ {formatDateUtc(marketPrice.recordDate)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-emerald-800">
              ยังไม่มีข้อมูลราคากลาง
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

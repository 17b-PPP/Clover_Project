const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function formatDateUtc(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Same as formatDateTime, but anchored to Thai wall-clock time instead of the
// runtime's own zone — the member portal renders its "data as of" stamp on the
// server, which may well be running in UTC.
export function formatDateTimeThai(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

// Time-of-day only, anchored to Thai wall-clock time — pairs with formatDateUtc
// on report rows that show a business date plus the moment of entry.
export function formatTimeThai(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

const bangkokDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Today's calendar day in Thailand, as YYYY-MM-DD — the default upper bound
// for date-range filters, so "ถึงวันที่" starts pinned to today instead of
// blank/unbounded.
export function todayBangkok(): string {
  return bangkokDayFormatter.format(new Date());
}

// The default lower bound for date-range filters across the app, so
// "จากวันที่" starts pinned to this date instead of blank/unbounded.
export const DEFAULT_DATE_FROM = "2026-06-23";

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

// Turns a "YYYY-MM" month key (as grouped by the monthly trend charts) into
// the first/last day of that month, for feeding straight into a date-range
// filter's dateFrom/dateTo.
export function monthKeyToDateRange(monthKey: string): {
  from: string;
  to: string;
} {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    from: `${monthKey}-01`,
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

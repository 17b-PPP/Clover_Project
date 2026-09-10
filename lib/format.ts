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

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

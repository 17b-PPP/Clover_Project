"use client";

import { useEffect, useRef, useState } from "react";

export const THAI_MONTHS = [
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

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// month is 1-12, year is the Buddhist year.
export interface MonthValue {
  month: number;
  year: number;
}

export interface MonthRange {
  start: MonthValue | null;
  end: MonthValue | null;
}

export function formatThaiMonth(value: MonthValue): string {
  return `${THAI_MONTHS[value.month - 1]} ${value.year}`;
}

function monthIndex(value: MonthValue): number {
  return value.year * 12 + value.month;
}

interface MonthRangePickerProps {
  label: string;
  value: MonthRange;
  onChange: (value: MonthRange) => void;
  placeholder?: string;
  className?: string;
}

// Month-only range calendar in a single field: a popover with Buddhist-year
// navigation and a 12-month grid. The first click picks the start month, the
// second the end month (swapped if it lands before the start). Native
// <input type="month"> renders Gregorian years in most browsers, which doesn't
// match how the co-op labels dividend periods.
export function MonthRangePicker({
  label,
  value,
  onChange,
  placeholder = "เลือกเดือนเริ่มต้น - เดือนสิ้นสุด",
  className = "",
}: MonthRangePickerProps) {
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    value.start?.year ?? currentBuddhistYear
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) setViewYear(value.start?.year ?? currentBuddhistYear);
    setOpen((o) => !o);
  }

  // A complete range (or nothing) means this click starts a new range;
  // otherwise it closes the one in progress.
  const pickingEnd = value.start !== null && value.end === null;

  function pick(month: MonthValue) {
    if (!pickingEnd || !value.start) {
      onChange({ start: month, end: null });
      return;
    }
    const [start, end] =
      monthIndex(month) < monthIndex(value.start)
        ? [month, value.start]
        : [value.start, month];
    onChange({ start, end });
    setOpen(false);
  }

  const display = value.start
    ? `${formatThaiMonth(value.start)} - ${
        value.end ? formatThaiMonth(value.end) : "..."
      }`
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col gap-1.5 ${className}`}
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={display ? `${label}: ${display}` : label}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        <span
          className={`truncate ${display ? "text-slate-900" : "text-slate-400"}`}
        >
          {display ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4 shrink-0 text-slate-400"
        >
          <rect x="3" y="4.5" width="14" height="12" rx="1.5" />
          <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <p className="mb-2 text-xs text-slate-500">
            {pickingEnd ? "เลือกเดือนสิ้นสุด" : "เลือกเดือนเริ่มต้น"}
          </p>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="ปีก่อนหน้า"
              className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="ปีถัดไป"
              className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {THAI_MONTHS_SHORT.map((name, i) => {
              const month = { month: i + 1, year: viewYear };
              const idx = monthIndex(month);
              const startIdx = value.start ? monthIndex(value.start) : null;
              const endIdx = value.end ? monthIndex(value.end) : null;
              const isEdge = idx === startIdx || idx === endIdx;
              const inRange =
                startIdx !== null &&
                endIdx !== null &&
                idx > startIdx &&
                idx < endIdx;
              return (
                <button
                  key={name}
                  type="button"
                  title={THAI_MONTHS[i]}
                  onClick={() => pick(month)}
                  className={`rounded-md py-2 text-sm transition-colors ${
                    isEdge
                      ? "bg-emerald-600 font-medium text-white"
                      : inRange
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

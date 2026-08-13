"use client";

import { useId, useMemo, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  emptyMessage?: string;
}

export function Combobox({
  label,
  options,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  error,
  emptyMessage = "ไม่พบข้อมูลที่ตรงกัน",
}: ComboboxProps) {
  const inputId = useId();
  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(selectedOption?.label ?? "");
  }

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selectedOption?.label.toLowerCase()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, selectedOption]);

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selectedOption?.label ?? "");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightedIndex(0);
            if (e.target.value === "") onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setQuery(selectedOption?.label ?? "");
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none ${
            error ? "border-red-400" : "border-slate-300"
          }`}
        />
        {open && !disabled && (
          <ul
            id={`${inputId}-listbox`}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">{emptyMessage}</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`cursor-pointer px-3 py-2 ${
                    index === highlightedIndex
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-700"
                  } ${option.value === value ? "font-medium" : ""}`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

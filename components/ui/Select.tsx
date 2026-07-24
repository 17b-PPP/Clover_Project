import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, error, id, required, className = "", children, ...props },
    ref
  ) {
    const selectId = id ?? label;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500 ${
            error ? "border-red-400" : "border-slate-300"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);

import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
}

function FieldLabel({ label, htmlFor, error, required }: FieldWrapperProps) {
  return (
    <div className="flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, required, className = "", ...props },
  ref
) {
  const inputId = id ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel
        label={label}
        htmlFor={inputId}
        error={error}
        required={required}
      />
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={`rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        {...props}
      />
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, error, id, required, className = "", ...props },
    ref
  ) {
    const inputId = id ?? label;
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel
          label={label}
          htmlFor={inputId}
          error={error}
          required={required}
        />
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          className={`rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500 ${
            error ? "border-red-400" : "border-slate-300"
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

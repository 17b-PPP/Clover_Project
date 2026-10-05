import type { ReactNode } from "react";

interface InfoSectionCardProps {
  title: string;
  children: ReactNode;
}

export function InfoSectionCard({ title, children }: InfoSectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">{children}</div>
    </section>
  );
}

interface InfoStatBoxProps {
  label: string;
  value?: ReactNode;
}

export function InfoStatBox({ label, value }: InfoStatBoxProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {value !== undefined && (
        <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

// A bare summary tile: label, big value, optional hint. Callers lay several of
// these out in their own grid.
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  // Tighter padding and a smaller value, for pages where the tile is a side
  // summary rather than the headline.
  compact?: boolean;
}

// A bare summary tile: label, big value, optional hint. Callers lay several of
// these out in their own grid.
export function StatCard({ label, value, hint, compact = false }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? "px-5 py-4" : "p-6"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums text-slate-900 ${
          compact ? "mt-1.5 text-xl" : "mt-3 text-2xl"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

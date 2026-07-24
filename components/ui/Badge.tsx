interface BadgeProps {
  tone: "success" | "neutral" | "danger";
  children: React.ReactNode;
}

const toneClasses: Record<BadgeProps["tone"], string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-500/20",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

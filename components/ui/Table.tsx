import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/80">{children}</thead>;
}

const headerAlignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function TableHeaderCell({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: keyof typeof headerAlignClasses;
  // Mostly for column widths: the browser's auto layout hands spare width to
  // whichever columns have the longest content, which leaves uneven gaps.
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${headerAlignClasses[align]} ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-slate-50">{children}</tr>;
}

export function TableCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: keyof typeof headerAlignClasses;
}) {
  return (
    <td className={`px-4 py-3 text-slate-700 ${headerAlignClasses[align]}`}>
      {children}
    </td>
  );
}

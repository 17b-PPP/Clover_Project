import type { MemberEmployeeInfo } from "@/lib/types";

interface EmployeeCardProps {
  employees: MemberEmployeeInfo[];
}

export function EmployeeCard({ employees }: EmployeeCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          ข้อมูลลูกจ้าง
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
          </svg>
        </span>
      </div>

      {employees.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          ยังไม่มีลูกจ้างที่รับซื้อแทนในขณะนี้
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {employees.map((employee) => (
            <li
              key={employee.employeeCode}
              className="rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {employee.firstName} {employee.lastName}
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {employee.employeeCode}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>โทร {employee.phone}</span>
                <span className="tabular-nums">
                  {employee.memberShare}% / {employee.employeeShare}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

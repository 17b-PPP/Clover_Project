import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/types";
import { DetailsCell } from "@/components/audit-log/DetailsCell";

const roleLabel: Record<AuditLogEntry["role"], string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STAFF: "พนักงาน",
};

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบประวัติการใช้งาน
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">เวลา</TableHeaderCell>
          <TableHeaderCell align="center">ชื่อผู้ใช้งาน</TableHeaderCell>
          <TableHeaderCell align="center">บทบาท</TableHeaderCell>
          <TableHeaderCell align="center">Action</TableHeaderCell>
          <TableHeaderCell align="center">รายละเอียด</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell align="center">
              <span className="whitespace-nowrap text-slate-500">
                {formatDateTime(entry.timestamp)}
              </span>
            </TableCell>
            <TableCell align="center">
              <span className="font-medium text-slate-900">
                {entry.username}
              </span>
            </TableCell>
            <TableCell align="center">
              <Badge tone={entry.role === "ADMIN" ? "success" : "neutral"}>
                {roleLabel[entry.role]}
              </Badge>
            </TableCell>
            <TableCell align="center">{entry.action}</TableCell>
            <TableCell align="center">
              <DetailsCell text={entry.details} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

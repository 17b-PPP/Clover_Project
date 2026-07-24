import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import type { Member } from "@/lib/types";

interface MemberTableProps {
  members: Member[];
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
}

export function MemberTable({
  members,
  onView,
  onEdit,
  onToggleStatus,
}: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
        ไม่พบข้อมูลสมาชิก
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>รหัสสมาชิก</TableHeaderCell>
          <TableHeaderCell>ชื่อ-นามสกุล</TableHeaderCell>
          <TableHeaderCell>ยอดเงินสะสม</TableHeaderCell>
          <TableHeaderCell>สถานะ</TableHeaderCell>
          <TableHeaderCell>จัดการ</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <span className="font-medium text-slate-900">
                {member.memberCode}
              </span>
            </TableCell>
            <TableCell>
              {member.firstName} {member.lastName}
            </TableCell>
            <TableCell>{formatCurrency(member.balance)}</TableCell>
            <TableCell>
              {member.status === "ACTIVE" ? (
                <Badge tone="success">ใช้งานอยู่</Badge>
              ) : (
                <Badge tone="danger">ถูกระงับ</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => onView(member)}>
                  ดูข้อมูล
                </Button>
                <Button variant="ghost" onClick={() => onEdit(member)}>
                  แก้ไข
                </Button>
                <Button
                  variant={member.status === "ACTIVE" ? "danger" : "secondary"}
                  onClick={() => onToggleStatus(member)}
                >
                  {member.status === "ACTIVE" ? "ระงับ" : "เปิดใช้งาน"}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

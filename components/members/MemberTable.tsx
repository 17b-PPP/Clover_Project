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
  onDelete: (member: Member) => void;
}

export function MemberTable({
  members,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: MemberTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบข้อมูลสมาชิก
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center" className="w-[12%]">รหัสสมาชิก</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[20%]">
            {/* Same box as the name cells below so the header starts where
                the names start. */}
            <div className="mx-auto w-36 pl-3 text-left">ชื่อ-นามสกุล</div>
          </TableHeaderCell>
          <TableHeaderCell align="center" className="w-[16%]">เลขบัตรประชาชน</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[14%]">ยอดเงินสะสม</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[13%]">สถานะ</TableHeaderCell>
          <TableHeaderCell align="center" className="w-[25%]">จัดการ</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell align="center">
              <span className="font-medium text-slate-900">
                {member.memberCode}
              </span>
            </TableCell>
            <TableCell align="center">
              {/* Fixed-width box centered under the header, names left-aligned
                  inside it so every first letter lines up. */}
              <div className="mx-auto w-36 whitespace-nowrap text-left">
                {member.firstName} {member.lastName}
              </div>
            </TableCell>
            <TableCell align="center">
              <span className="font-mono text-slate-600">
                {member.idCardNumber}
              </span>
            </TableCell>
            <TableCell align="center">{formatCurrency(member.walletBalance)}</TableCell>
            <TableCell align="center">
              {member.status === "Active" ? (
                <Badge tone="success">ใช้งานอยู่</Badge>
              ) : (
                <Badge tone="danger">ถูกระงับ</Badge>
              )}
            </TableCell>
            <TableCell align="center">
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" onClick={() => onView(member)}>
                  ดูข้อมูล
                </Button>
                <Button variant="ghost" onClick={() => onEdit(member)}>
                  แก้ไข
                </Button>
                <Button
                  variant={member.status === "Active" ? "danger" : "secondary"}
                  onClick={() => onToggleStatus(member)}
                >
                  {member.status === "Active" ? "ระงับ" : "เปิดใช้งาน"}
                </Button>
                {member.status === "Inactive" && (
                  <Button variant="danger" onClick={() => onDelete(member)}>
                    ลบ
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

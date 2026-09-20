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
import type { User } from "@/lib/types";

const roleLabel: Record<User["role"], string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STAFF: "พนักงาน",
};

interface UserTableProps {
  users: User[];
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UserTable({
  users,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบข้อมูลผู้ใช้งาน
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell align="center">บทบาท</TableHeaderCell>
          <TableHeaderCell align="center">ชื่อ-นามสกุล</TableHeaderCell>
          <TableHeaderCell align="center">ชื่อผู้ใช้งาน</TableHeaderCell>
          <TableHeaderCell align="center">อีเมล</TableHeaderCell>
          <TableHeaderCell align="center">สถานะ</TableHeaderCell>
          <TableHeaderCell align="center">จัดการ</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell align="center">
              <Badge tone={user.role === "ADMIN" ? "success" : "neutral"}>
                {roleLabel[user.role]}
              </Badge>
            </TableCell>
            <TableCell align="center">
              <span className="font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </span>
            </TableCell>
            <TableCell align="center">{user.username}</TableCell>
            <TableCell align="center">{user.email}</TableCell>
            <TableCell align="center">
              {user.status === "Active" ? (
                <Badge tone="success">ใช้งานอยู่</Badge>
              ) : (
                <Badge tone="danger">ถูกระงับ</Badge>
              )}
            </TableCell>
            <TableCell align="center">
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" onClick={() => onView(user)}>
                  ดูข้อมูล
                </Button>
                <Button variant="ghost" onClick={() => onEdit(user)}>
                  แก้ไข
                </Button>
                <Button
                  variant={user.status === "Active" ? "danger" : "secondary"}
                  onClick={() => onToggleStatus(user)}
                >
                  {user.status === "Active" ? "ระงับ" : "เปิดใช้งาน"}
                </Button>
                {user.status === "Inactive" && (
                  <Button variant="danger" onClick={() => onDelete(user)}>
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

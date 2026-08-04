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
import type { Employee } from "@/lib/types";

interface EmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onToggleStatus: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export function EmployeeTable({
  employees,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบข้อมูลลูกจ้าง
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>รหัสลูกจ้าง</TableHeaderCell>
          <TableHeaderCell>ชื่อ-นามสกุล</TableHeaderCell>
          <TableHeaderCell>สถานะ</TableHeaderCell>
          <TableHeaderCell>จัดการ</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <span className="font-medium text-slate-900">
                {employee.employeeCode}
              </span>
            </TableCell>
            <TableCell>
              {employee.firstName} {employee.lastName}
            </TableCell>
            <TableCell>
              {employee.status === "Active" ? (
                <Badge tone="success">ใช้งานอยู่</Badge>
              ) : (
                <Badge tone="danger">ถูกระงับ</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => onView(employee)}>
                  ดูข้อมูล
                </Button>
                <Button variant="ghost" onClick={() => onEdit(employee)}>
                  แก้ไข
                </Button>
                <Button
                  variant={
                    employee.status === "Active" ? "danger" : "secondary"
                  }
                  onClick={() => onToggleStatus(employee)}
                >
                  {employee.status === "Active" ? "ระงับ" : "เปิดใช้งาน"}
                </Button>
                {employee.status === "Inactive" && (
                  <Button variant="danger" onClick={() => onDelete(employee)}>
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

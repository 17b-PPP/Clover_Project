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
import type { Contract } from "@/lib/types";

interface ContractTableProps {
  contracts: Contract[];
  onView: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onToggleStatus: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onViewHistory: (contract: Contract) => void;
}

export function ContractTable({
  contracts,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewHistory,
}: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
        ไม่พบข้อมูลสัญญาจ้าง
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>รหัสจับคู่</TableHeaderCell>
          <TableHeaderCell>เจ้าของสวน</TableHeaderCell>
          <TableHeaderCell>ลูกจ้าง</TableHeaderCell>
          <TableHeaderCell>สัดส่วน</TableHeaderCell>
          <TableHeaderCell>สถานะ</TableHeaderCell>
          <TableHeaderCell>จัดการ</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {contracts.map((contract) => {
          const isExpired =
            contract.contractEndDate !== null &&
            new Date(contract.contractEndDate) <= new Date();

          return (
            <TableRow key={contract.id}>
              <TableCell>
                <span className="font-medium text-slate-900">
                  {contract.pairCode}
                </span>
              </TableCell>
              <TableCell>
                {contract.member.firstName} {contract.member.lastName}
              </TableCell>
              <TableCell>
                {contract.employee.firstName} {contract.employee.lastName}
              </TableCell>
              <TableCell>
                {contract.memberShare}% / {contract.employeeShare}%
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {isExpired ? (
                    <Badge tone="neutral">สิ้นสุดสัญญาแล้ว</Badge>
                  ) : contract.status === "Active" ? (
                    <Badge tone="success">ใช้งานอยู่</Badge>
                  ) : (
                    <Badge tone="danger">ถูกระงับ</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => onView(contract)}>
                    ดูข้อมูล
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onViewHistory(contract)}
                  >
                    ประวัติ
                  </Button>
                  {!isExpired && (
                    <>
                      <Button variant="ghost" onClick={() => onEdit(contract)}>
                        แก้ไข
                      </Button>
                      <Button
                        variant={
                          contract.status === "Active" ? "danger" : "secondary"
                        }
                        onClick={() => onToggleStatus(contract)}
                      >
                        {contract.status === "Active" ? "ระงับ" : "เปิดใช้งาน"}
                      </Button>
                      {contract.status === "Inactive" && (
                        <Button
                          variant="danger"
                          onClick={() => onDelete(contract)}
                        >
                          ลบ
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

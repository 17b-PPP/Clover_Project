"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { Contract } from "@/lib/types";

interface ContractHistoryDialogProps {
  open: boolean;
  contract: Contract | null;
  onClose: () => void;
}

export function ContractHistoryDialog({
  open,
  contract,
  onClose,
}: ContractHistoryDialogProps) {
  const [history, setHistory] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !contract) return;
    fetch(
      `/api/contracts/history?memberId=${contract.member.id}&employeeId=${contract.employee.id}`
    )
      .then((res) => res.json())
      .then((data: Contract[]) => {
        setHistory(data);
        setLoading(false);
      });
  }, [open, contract]);

  if (!contract) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ประวัติสัดส่วนสัญญา"
      widthClassName="max-w-xl"
    >
      <p className="mb-4 text-sm text-slate-500">
        {contract.member.firstName} {contract.member.lastName} (
        {contract.member.code}) ↔ {contract.employee.firstName}{" "}
        {contract.employee.lastName} ({contract.employee.code})
      </p>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          กำลังโหลดข้อมูล...
        </p>
      ) : (
        <ul className="space-y-3">
          {history.map((entry) => {
            const isCurrent = entry.contractEndDate === null;
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    เจ้าของสวน {entry.memberShare}% / ลูกจ้าง{" "}
                    {entry.employeeShare}%
                  </span>
                  {isCurrent ? (
                    <Badge tone="success">ปัจจุบัน</Badge>
                  ) : (
                    <Badge tone="neutral">สิ้นสุดแล้ว</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(entry.contractStartDate)}
                  {" – "}
                  {entry.contractEndDate
                    ? formatDate(entry.contractEndDate)
                    : "ปัจจุบัน"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

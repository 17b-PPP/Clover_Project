"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  Contract,
  ContractInput,
  EmployeeOption,
  MemberOption,
} from "@/lib/types";

export type ContractFormMode = "add" | "view" | "edit";

interface ContractFormDialogProps {
  open: boolean;
  mode: ContractFormMode;
  contract?: Contract | null;
  members: MemberOption[];
  employees: EmployeeOption[];
  onClose: () => void;
  onSubmit: (input: ContractInput) => Promise<void>;
  onRequestEdit?: () => void;
}

const titleByMode: Record<ContractFormMode, string> = {
  add: "เพิ่มสัญญาจ้างใหม่",
  view: "ข้อมูลสัญญาจ้าง",
  edit: "ต่อสัญญาด้วยสัดส่วนใหม่",
};

export function ContractFormDialog({
  open,
  mode,
  contract,
  members,
  employees,
  onClose,
  onSubmit,
  onRequestEdit,
}: ContractFormDialogProps) {
  const [memberId, setMemberId] = useState(contract?.member.id ?? "");
  const [employeeId, setEmployeeId] = useState(contract?.employee.id ?? "");
  const [memberShare, setMemberShare] = useState(
    contract?.memberShare ?? 50
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = mode === "view";
  const isRenew = mode === "edit";
  const employeeShare = Math.round((100 - memberShare) * 100) / 100;

  const activeMembers = members.filter(
    (m) => m.status === "Active" || m.id === memberId
  );
  const activeEmployees = employees.filter(
    (e) => e.status === "Active" || e.id === employeeId
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        memberId,
        employeeId,
        memberShare,
        employeeShare,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  const footer = readOnly ? (
    <>
      <Button variant="secondary" onClick={onClose}>
        ปิด
      </Button>
      {onRequestEdit && (
        <Button variant="primary" onClick={onRequestEdit}>
          ต่อสัญญาด้วยสัดส่วนใหม่
        </Button>
      )}
    </>
  ) : (
    <>
      <Button variant="secondary" type="button" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button
        variant="primary"
        type="submit"
        form="contract-form"
        disabled={submitting}
      >
        {submitting
          ? "กำลังบันทึก..."
          : isRenew
          ? "ยืนยันการต่อสัญญา"
          : "บันทึก"}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleByMode[mode]}
      widthClassName="max-w-xl"
      footer={footer}
    >
      {readOnly && contract ? (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-slate-500">รหัสจับคู่</p>
            <p className="font-medium text-slate-900">{contract.pairCode}</p>
          </div>
          <div>
            <p className="text-slate-500">เจ้าของสวน</p>
            <p className="font-medium text-slate-900">
              {contract.member.firstName} {contract.member.lastName} (
              {contract.member.code})
            </p>
          </div>
          <div>
            <p className="text-slate-500">ลูกจ้าง</p>
            <p className="font-medium text-slate-900">
              {contract.employee.firstName} {contract.employee.lastName} (
              {contract.employee.code})
            </p>
          </div>
          <div>
            <p className="text-slate-500">สัดส่วน</p>
            <p className="font-medium text-slate-900">
              เจ้าของสวน {contract.memberShare}% / ลูกจ้าง{" "}
              {contract.employeeShare}%
            </p>
          </div>
        </div>
      ) : (
        <form id="contract-form" onSubmit={handleSubmit} className="space-y-5">
          {isRenew && contract ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">
                คู่สัญญา (ไม่สามารถเปลี่ยนได้เมื่อต่อสัญญา)
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {contract.member.firstName} {contract.member.lastName} (
                {contract.member.code}) ↔ {contract.employee.firstName}{" "}
                {contract.employee.lastName} ({contract.employee.code})
              </p>
              <p className="mt-2 text-slate-500">
                สัดส่วนเดิม: เจ้าของสวน {contract.memberShare}% / ลูกจ้าง{" "}
                {contract.employeeShare}%
              </p>
            </div>
          ) : (
            <>
              <Select
                label="เจ้าของสวน (รหัสสมาชิก)"
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="" disabled>
                  เลือกสมาชิก
                </option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberCode} — {m.firstName} {m.lastName}
                  </option>
                ))}
              </Select>

              <Select
                label="ลูกจ้าง (รหัสลูกจ้าง)"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="" disabled>
                  เลือกลูกจ้าง
                </option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} — {e.firstName} {e.lastName}
                  </option>
                ))}
              </Select>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="สัดส่วนเจ้าของสวน (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              value={memberShare}
              onChange={(e) => setMemberShare(Number(e.target.value))}
            />
            <Input
              label="สัดส่วนลูกจ้าง (%)"
              type="number"
              value={employeeShare}
              disabled
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

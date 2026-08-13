"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
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
  edit: "แก้ไขสัดส่วนรายได้",
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
  const [employeeShare, setEmployeeShare] = useState(
    contract?.employeeShare ?? 50
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = mode === "view";
  const isEdit = mode === "edit";
  const memberShare = Math.round((100 - employeeShare) * 100) / 100;

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
          แก้ไขสัดส่วนรายได้
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
          : isEdit
          ? "บันทึกสัดส่วนใหม่"
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
          {isEdit && contract ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">
                คู่สัญญา (ไม่สามารถเปลี่ยนได้เมื่อแก้ไขสัดส่วน)
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {contract.member.firstName} {contract.member.lastName} (
                {contract.member.code}) ↔ {contract.employee.firstName}{" "}
                {contract.employee.lastName} ({contract.employee.code})
              </p>
              <p className="mt-2 text-slate-500">
                สัดส่วนปัจจุบัน: เจ้าของสวน {contract.memberShare}% / ลูกจ้าง{" "}
                {contract.employeeShare}%
              </p>
            </div>
          ) : (
            <>
              <Combobox
                label="เจ้าของสวน (รหัสสมาชิก)"
                required
                placeholder="พิมพ์รหัสหรือชื่อสมาชิก"
                value={memberId}
                onChange={setMemberId}
                options={activeMembers.map((m) => ({
                  value: m.id,
                  label: `${m.memberCode} — ${m.firstName} ${m.lastName}`,
                }))}
              />

              <Combobox
                label="ลูกจ้าง (รหัสลูกจ้าง)"
                required
                placeholder="พิมพ์รหัสหรือชื่อลูกจ้าง"
                value={employeeId}
                onChange={setEmployeeId}
                options={activeEmployees.map((e) => ({
                  value: e.id,
                  label: `${e.employeeCode} — ${e.firstName} ${e.lastName}`,
                }))}
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="สัดส่วนลูกจ้าง (%)"
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              value={employeeShare}
              onChange={(e) => setEmployeeShare(Number(e.target.value))}
            />
            <Input
              label="สัดส่วนเจ้าของสวน (%)"
              type="number"
              value={memberShare}
              disabled
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

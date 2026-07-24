"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Contract } from "@/lib/types";

interface SuspendConfirmDialogProps {
  open: boolean;
  contract: Contract | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SuspendConfirmDialog({
  open,
  contract,
  onClose,
  onConfirm,
}: SuspendConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  if (!contract) return null;

  const willSuspend = contract.status === "Active";

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={willSuspend ? "ระงับสัญญาจ้าง" : "เปิดใช้งานสัญญาจ้าง"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant={willSuspend ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? "กำลังดำเนินการ..."
              : willSuspend
              ? "ยืนยันการระงับ"
              : "ยืนยันการเปิดใช้งาน"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {willSuspend ? (
          <>
            ต้องการระงับสัญญาจ้างของ{" "}
            <span className="font-medium text-slate-900">
              {contract.member.firstName} {contract.member.lastName}
            </span>{" "}
            กับ{" "}
            <span className="font-medium text-slate-900">
              {contract.employee.firstName} {contract.employee.lastName}
            </span>{" "}
            ({contract.pairCode}) ใช่หรือไม่?
          </>
        ) : (
          <>
            ต้องการเปิดใช้งานสัญญาจ้าง{" "}
            <span className="font-medium text-slate-900">
              {contract.pairCode}
            </span>{" "}
            อีกครั้งใช่หรือไม่?
          </>
        )}
      </p>
    </Modal>
  );
}

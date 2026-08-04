"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Employee } from "@/lib/types";

interface SuspendConfirmDialogProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SuspendConfirmDialog({
  open,
  employee,
  onClose,
  onConfirm,
}: SuspendConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  if (!employee) return null;

  const willSuspend = employee.status === "Active";

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
      title={willSuspend ? "ระงับลูกจ้าง" : "เปิดใช้งานลูกจ้าง"}
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
            ต้องการระงับการใช้งานของ{" "}
            <span className="font-medium text-slate-900">
              {employee.firstName} {employee.lastName}
            </span>{" "}
            ({employee.employeeCode}) ใช่หรือไม่?
          </>
        ) : (
          <>
            ต้องการเปิดใช้งาน{" "}
            <span className="font-medium text-slate-900">
              {employee.firstName} {employee.lastName}
            </span>{" "}
            ({employee.employeeCode}) อีกครั้งใช่หรือไม่?
          </>
        )}
      </p>
    </Modal>
  );
}

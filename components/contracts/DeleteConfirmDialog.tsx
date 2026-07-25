"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Contract } from "@/lib/types";

interface DeleteConfirmDialogProps {
  open: boolean;
  contract: Contract | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  contract,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!contract) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถลบสัญญาจ้างได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ลบสัญญาจ้าง"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "กำลังลบ..." : "ยืนยันการลบ"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        ต้องการลบสัญญาจ้าง{" "}
        <span className="font-medium text-slate-900">
          {contract.pairCode}
        </span>{" "}
        ระหว่าง {contract.member.firstName} {contract.member.lastName} กับ{" "}
        {contract.employee.firstName} {contract.employee.lastName}{" "}
        อย่างถาวรใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

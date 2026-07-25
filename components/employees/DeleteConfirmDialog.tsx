"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Employee } from "@/lib/types";

interface DeleteConfirmDialogProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  employee,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!employee) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถลบลูกจ้างได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ลบลูกจ้าง"
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
        ต้องการลบข้อมูลของ{" "}
        <span className="font-medium text-slate-900">
          {employee.firstName} {employee.lastName}
        </span>{" "}
        ({employee.employeeCode}) อย่างถาวรใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

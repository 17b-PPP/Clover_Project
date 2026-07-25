"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Member } from "@/lib/types";

interface DeleteConfirmDialogProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  member,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!member) return null;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถลบสมาชิกได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ลบสมาชิก"
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
          {member.firstName} {member.lastName}
        </span>{" "}
        ({member.memberCode}) อย่างถาวรใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Member } from "@/lib/types";

interface SuspendConfirmDialogProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SuspendConfirmDialog({
  open,
  member,
  onClose,
  onConfirm,
}: SuspendConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  if (!member) return null;

  const willSuspend = member.status === "Active";

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
      title={willSuspend ? "ระงับสมาชิก" : "เปิดใช้งานสมาชิก"}
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
              {member.firstName} {member.lastName}
            </span>{" "}
            ({member.memberCode}) ใช่หรือไม่?
          </>
        ) : (
          <>
            ต้องการเปิดใช้งาน{" "}
            <span className="font-medium text-slate-900">
              {member.firstName} {member.lastName}
            </span>{" "}
            ({member.memberCode}) อีกครั้งใช่หรือไม่?
          </>
        )}
      </p>
    </Modal>
  );
}

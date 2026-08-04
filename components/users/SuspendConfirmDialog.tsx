"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { User } from "@/lib/types";

interface SuspendConfirmDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SuspendConfirmDialog({
  open,
  user,
  onClose,
  onConfirm,
}: SuspendConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  if (!user) return null;

  const willSuspend = user.status === "Active";

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
      title={willSuspend ? "ระงับผู้ใช้งาน" : "เปิดใช้งานผู้ใช้งาน"}
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
              {user.firstName} {user.lastName}
            </span>{" "}
            ({user.username}) ใช่หรือไม่?
          </>
        ) : (
          <>
            ต้องการเปิดใช้งาน{" "}
            <span className="font-medium text-slate-900">
              {user.firstName} {user.lastName}
            </span>{" "}
            ({user.username}) อีกครั้งใช่หรือไม่?
          </>
        )}
      </p>
    </Modal>
  );
}

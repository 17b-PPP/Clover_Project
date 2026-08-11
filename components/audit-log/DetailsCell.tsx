"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

const TRUNCATE_LENGTH = 60;

export function DetailsCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > TRUNCATE_LENGTH;

  if (!isLong) {
    return <span>{text}</span>;
  }

  return (
    <>
      <span>
        {text.slice(0, TRUNCATE_LENGTH)}...{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          ดูข้อความเต็ม
        </button>
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="รายละเอียด">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{text}</p>
      </Modal>
    </>
  );
}

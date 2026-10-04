"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";

// Fills its parent's width on one line, cutting off with an ellipsis. The
// "ดูข้อความเต็ม" link only appears when the text actually overflows —
// measured rather than counted, since Thai character widths vary too much for
// a character limit to line up with the column edge.
export function DetailsCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span ref={textRef} className="truncate">
          {text}
        </span>
        {overflowing && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            ดูข้อความเต็ม
          </button>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="รายละเอียด">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{text}</p>
      </Modal>
    </>
  );
}

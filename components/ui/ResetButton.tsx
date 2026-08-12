import { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";

interface ResetButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  label?: string;
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M3 12a9 9 0 1 1 2.64 6.36M3 12V6m0 6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ResetButton({
  label = "ล้างการเลือกวันที่",
  className = "",
  ...props
}: ResetButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={label}
      title={label}
      className={`h-[38px] w-[38px] shrink-0 !p-0 !px-0 !py-0 ${className}`}
      {...props}
    >
      <ResetIcon />
    </Button>
  );
}

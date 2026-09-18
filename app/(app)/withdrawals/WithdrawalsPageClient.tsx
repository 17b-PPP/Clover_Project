"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { LiveClock } from "@/components/purchases/LiveClock";
import { WithdrawalReceipt } from "@/components/withdrawals/WithdrawalReceipt";
import { useMemberLookup } from "@/components/hooks/useMemberLookup";
import type { Withdrawal } from "@/lib/types";

interface WithdrawalsPageClientProps {
  memberOptions: ComboboxOption[];
}

export function WithdrawalsPageClient({
  memberOptions,
}: WithdrawalsPageClientProps) {
  const [memberCode, setMemberCode] = useState("");
  const [amount, setAmount] = useState("");

  const [saved, setSaved] = useState<Withdrawal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const member = useMemberLookup(memberCode);
  const locked = saved !== null;

  // After saving, show the balance the withdrawal actually left behind
  // instead of the pre-withdrawal figure still cached in the lookup.
  const displayedBalance = saved ? saved.balanceAfter : member.data?.walletBalance;

  function resetForm() {
    setMemberCode("");
    setAmount("");
    setSaved(null);
    setFormError(null);
  }

  function openConfirm() {
    setFormError(null);

    if (!member.data) {
      setFormError("กรุณากรอกรหัสสมาชิกที่ถูกต้อง");
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) {
      setFormError("กรุณากรอกยอดเงินที่ต้องการเบิก");
      return;
    }
    if (value > member.data.walletBalance) {
      setFormError("ยอดเงินสะสมไม่เพียงพอสำหรับการเบิกครั้งนี้");
      return;
    }

    setConfirmOpen(true);
  }

  async function submitWithdrawal() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCode, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกรายการเบิกเงินได้");
      }
      setSaved(data as Withdrawal);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader
        title="การจัดการเบิกเงิน"
        description="เบิกเงินจากยอดเงินสะสมของสมาชิก และพิมพ์ใบเสร็จ"
        action={<LiveClock />}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">
          ยืนยันตัวตนสมาชิก
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Combobox
              label="รหัสสมาชิก"
              options={memberOptions}
              value={memberCode}
              onChange={setMemberCode}
              disabled={locked}
              placeholder="พิมพ์ชื่อหรือรหัสสมาชิก"
              error={member.error ?? undefined}
              emptyMessage="ไม่พบสมาชิกที่ตรงกัน"
            />
            {member.loading && (
              <span className="mt-1 block text-xs text-slate-400">
                กำลังค้นหา...
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              {saved ? "ยอดเงินคงเหลือหลังเบิก" : "ยอดเงินที่มีสะสม"}
            </label>
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
              <span className="text-xs font-medium text-emerald-700">
                บาท
              </span>
              <span className="text-sm font-semibold text-emerald-800">
                {displayedBalance !== undefined
                  ? displayedBalance.toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </div>
        </div>

        <h2 className="mb-4 mt-8 border-t border-slate-200 pt-6 font-semibold text-slate-900">
          รายละเอียดการเบิกเงิน
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="ผู้รับเงิน"
            value={member.data?.fullName ?? ""}
            readOnly
            disabled
            placeholder="ระบบจะแสดงให้อัตโนมัติ"
          />

          <Input
            label="ยอดเงินที่ต้องการเบิก"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            disabled={locked}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <Button
            type="button"
            variant="primary"
            disabled={locked || submitting}
            onClick={openConfirm}
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยัน"}
          </Button>
          <Button type="button" variant="secondary" onClick={resetForm}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!locked}
            onClick={handlePrint}
          >
            พิมพ์ใบเสร็จ
          </Button>
        </div>
      </div>

      {saved && <WithdrawalReceipt withdrawal={saved} />}

      <ConfirmDialog
        open={confirmOpen}
        title="ยืนยันการทำรายการ"
        message="ต้องการบันทึกรายการเบิกเงินนี้ใช่หรือไม่?"
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitWithdrawal}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WithdrawalReceipt } from "@/components/withdrawals/WithdrawalReceipt";
import { useMemberLookup } from "@/components/hooks/useMemberLookup";
import type { Withdrawal } from "@/lib/types";

function formatTimestamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function SectionLabel({
  icon,
  title,
  caption,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
      <div className="flex items-center gap-2">
        <span className="text-emerald-700">{icon}</span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <span className="font-mono text-xs tracking-wide text-slate-400">
        {caption}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="font-mono text-xs font-medium uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

export function WithdrawalsPageClient() {
  const [memberCode, setMemberCode] = useState("");
  const [amount, setAmount] = useState("");

  const [saved, setSaved] = useState<Withdrawal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setTime(formatTimestamp(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  const member = useMemberLookup(memberCode);
  const locked = saved !== null;

  function resetForm() {
    setMemberCode("");
    setAmount("");
    setSaved(null);
    setFormError(null);
  }

  async function handleExecute() {
    if (locked) {
      window.print();
      return;
    }

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

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCode, amount: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกรายการเบิกเงินได้");
      }
      setSaved(data as Withdrawal);
      setTimeout(() => window.print(), 100);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  const total = Number(amount) || 0;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            ระบบเบิกเงิน
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เบิกเงินจากยอดเงินสะสมของสมาชิก และพิมพ์ใบเสร็จ
          </p>
        </div>
        <div className="text-right font-mono text-xs text-slate-400">
          TIMESTAMP: {time ?? "--:--:--"}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionLabel
          title="ยืนยันตัวตนสมาชิก"
          caption="MEMBER_AUTHENTICATION"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="9" cy="7" r="4" />
              <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          }
        />

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>MEMBER_SEARCH (รหัสสมาชิก)</FieldLabel>
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-600 ${
                member.error ? "border-red-400" : "border-slate-300"
              }`}
            >
              <input
                type="text"
                value={memberCode}
                disabled={locked}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="เช่น M-0001"
                className="w-full border-none bg-transparent p-0 font-mono text-sm text-slate-900 focus:outline-none focus:ring-0"
              />
              {member.data && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-5 w-5 shrink-0 text-emerald-600"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.5 12 2.5 2.5 4.5-4.5" />
                </svg>
              )}
            </div>
            {member.loading && (
              <span className="text-xs text-slate-400">กำลังค้นหา...</span>
            )}
            {member.error && (
              <span className="text-xs text-red-600">{member.error}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>AVAILABLE_BALANCE (ยอดเงินที่มีสะสม)</FieldLabel>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
              <span className="font-mono text-base font-semibold text-emerald-700">
                {member.data ? member.data.walletBalance.toFixed(2) : "0.00"}
              </span>
              <span className="font-mono text-xs text-slate-400">THB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionLabel
          title="รายละเอียดการเบิกเงิน"
          caption="TRANSACTION_PARAMETERS"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>WITHDRAWAL_AMOUNT (ยอดเงินที่ต้องการเบิก)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              disabled={locked}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel>RECIPIENT_IDENTITY (ผู้รับเงิน)</FieldLabel>
            <input
              type="text"
              readOnly
              disabled
              value={member.data?.fullName ?? ""}
              placeholder="ระบบจะแสดงให้อัตโนมัติ"
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-sm text-slate-600 shadow-none"
            />
          </div>
        </div>
      </div>

      {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm text-slate-500">
            Summary Pending Validation
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {total.toFixed(2)} <span className="text-base font-medium text-slate-400">THB</span>
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            ยกเลิกรายการ
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M6 9V2h12v7M6 18h12v4H6zM6 14h12M4 9h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2v-4H6v4H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
            </svg>
            {submitting
              ? "กำลังบันทึก..."
              : locked
              ? "พิมพ์ใบเสร็จอีกครั้ง"
              : "ยืนยันและพิมพ์"}
          </button>
        </div>
      </div>

      {saved && <WithdrawalReceipt withdrawal={saved} />}
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { usePostalCodeLookup } from "@/components/hooks/usePostalCodeLookup";
import { resizeImageToDataUrl } from "@/lib/image";
import type { Member, MemberInput } from "@/lib/types";

export type MemberFormMode = "add" | "view" | "edit";

interface MemberFormDialogProps {
  open: boolean;
  mode: MemberFormMode;
  member?: Member | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: MemberInput) => Promise<void>;
  onRequestEdit?: () => void;
}

const emptyForm: MemberInput = {
  firstName: "",
  lastName: "",
  idCardNumber: "",
  dateOfBirth: "",
  phone: "",
  address: "",
  district: "",
  province: "",
  postalCode: "",
  photoUrl: null,
  gardenName: null,
};

const titleByMode: Record<MemberFormMode, string> = {
  add: "เพิ่มสมาชิกใหม่",
  view: "ข้อมูลสมาชิก",
  edit: "แก้ไขข้อมูลสมาชิก",
};

export function MemberFormDialog({
  open,
  mode,
  member,
  loading = false,
  onClose,
  onSubmit,
  onRequestEdit,
}: MemberFormDialogProps) {
  const [form, setForm] = useState<MemberInput>(() =>
    member
      ? {
          firstName: member.firstName,
          lastName: member.lastName,
          idCardNumber: member.idCardNumber,
          dateOfBirth: member.dateOfBirth.slice(0, 10),
          phone: member.phone,
          address: member.address,
          district: member.district,
          province: member.province,
          postalCode: member.postalCode,
          photoUrl: member.photoUrl,
          gardenName: member.gardenName,
        }
      : emptyForm
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = mode === "view";
  const postalMatches = usePostalCodeLookup(form.postalCode);

  useEffect(() => {
    if (readOnly || postalMatches.length === 0) return;
    setForm((prev) => ({
      ...prev,
      district: postalMatches[0].amphoe,
      province: postalMatches[0].province,
    }));
  }, [postalMatches, readOnly]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  const footer = readOnly ? (
    <>
      <Button variant="secondary" onClick={onClose}>
        ปิด
      </Button>
      {onRequestEdit && (
        <Button variant="primary" onClick={onRequestEdit}>
          แก้ไขข้อมูล
        </Button>
      )}
    </>
  ) : (
    <>
      <Button variant="secondary" type="button" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button variant="primary" type="submit" form="member-form" disabled={submitting}>
        {submitting ? "กำลังบันทึก..." : "บันทึก"}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleByMode[mode]}
      widthClassName="max-w-2xl"
      footer={loading ? undefined : footer}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form id="member-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs text-slate-400">
            {form.photoUrl ? (
              <Image
                src={form.photoUrl}
                alt="รูปถ่ายสมาชิก"
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              "ไม่มีรูป"
            )}
          </div>
          {!readOnly && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">
                รูปถ่าย
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ชื่อ"
            required
            disabled={readOnly}
            value={form.firstName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, firstName: e.target.value }))
            }
          />
          <Input
            label="นามสกุล"
            required
            disabled={readOnly}
            value={form.lastName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, lastName: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="เลขบัตรประชาชน"
            required
            disabled={readOnly}
            inputMode="numeric"
            pattern="[0-9]{13}"
            title="เลขบัตรประชาชน 13 หลัก"
            minLength={13}
            maxLength={13}
            value={form.idCardNumber}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                idCardNumber: e.target.value.replace(/\D/g, ""),
              }))
            }
          />
          <Input
            label="วันเกิด"
            type="date"
            required
            disabled={readOnly}
            value={form.dateOfBirth}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))
            }
          />
        </div>

        <Input
          label="เบอร์โทร"
          required
          disabled={readOnly}
          inputMode="numeric"
          pattern="[0-9]{10}"
          title="เบอร์โทร 10 หลัก"
          minLength={10}
          maxLength={10}
          value={form.phone}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              phone: e.target.value.replace(/\D/g, ""),
            }))
          }
        />

        <Textarea
          label="ที่อยู่"
          required
          rows={3}
          disabled={readOnly}
          value={form.address}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, address: e.target.value }))
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="อำเภอ"
            required
            disabled={readOnly}
            value={form.district}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, district: e.target.value }))
            }
          />
          <Input
            label="จังหวัด"
            required
            disabled={readOnly}
            value={form.province}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, province: e.target.value }))
            }
          />
        </div>

        <Input
          label="รหัสไปรษณีย์"
          required
          disabled={readOnly}
          inputMode="numeric"
          maxLength={5}
          value={form.postalCode}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              postalCode: e.target.value.replace(/\D/g, ""),
            }))
          }
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

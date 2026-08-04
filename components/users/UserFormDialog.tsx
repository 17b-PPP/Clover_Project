"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { User, UserInput } from "@/lib/types";

export type UserFormMode = "add" | "view" | "edit";

interface UserFormDialogProps {
  open: boolean;
  mode: UserFormMode;
  user?: User | null;
  onClose: () => void;
  onSubmit: (input: UserInput) => Promise<void>;
  onRequestEdit?: () => void;
}

const emptyForm: UserInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  username: "",
  role: "STAFF",
  password: "",
};

const titleByMode: Record<UserFormMode, string> = {
  add: "เพิ่มผู้ใช้งานใหม่",
  view: "ข้อมูลผู้ใช้งาน",
  edit: "แก้ไขข้อมูลผู้ใช้งาน",
};

export function UserFormDialog({
  open,
  mode,
  user,
  onClose,
  onSubmit,
  onRequestEdit,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserInput>(() =>
    user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          username: user.username,
          role: user.role,
          password: "",
        }
      : emptyForm
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = mode === "view";

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
      <Button variant="primary" type="submit" form="user-form" disabled={submitting}>
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
      footer={footer}
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
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

        <Input
          label="อีเมล"
          type="email"
          required
          disabled={readOnly}
          value={form.email}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, email: e.target.value }))
          }
        />

        <Input
          label="ชื่อผู้ใช้งาน"
          required
          disabled={readOnly}
          value={form.username}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, username: e.target.value }))
          }
        />

        {!readOnly && (
          <Input
            label={
              mode === "add"
                ? "รหัสผ่าน"
                : "รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)"
            }
            type="password"
            required={mode === "add"}
            minLength={6}
            autoComplete="new-password"
            value={form.password ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
          />
        )}

        <Select
          label="บทบาท"
          required
          disabled={readOnly}
          value={form.role}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              role: e.target.value as UserInput["role"],
            }))
          }
        >
          <option value="STAFF">พนักงาน (Staff)</option>
          <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
        </Select>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}

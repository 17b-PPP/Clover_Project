"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { MemberTable } from "@/components/members/MemberTable";
import {
  MemberFormDialog,
  MemberFormMode,
} from "@/components/members/MemberFormDialog";
import { SuspendConfirmDialog } from "@/components/members/SuspendConfirmDialog";
import { DeleteConfirmDialog } from "@/components/members/DeleteConfirmDialog";
import type { Member, MemberInput } from "@/lib/types";

interface MembersPageClientProps {
  initialMembers: Member[];
}

export function MembersPageClient({ initialMembers }: MembersPageClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<MemberFormMode>("add");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [statusMember, setStatusMember] = useState<Member | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.memberCode, m.firstName, m.lastName, m.phone]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [members, search]);

  function openAddForm() {
    setSelectedMember(null);
    setFormMode("add");
    setFormOpen(true);
  }

  // The list omits photoUrl (see getMembers()), so viewing/editing a member
  // fetches the full record — including the real photo — on demand.
  async function fetchFullMember(id: string): Promise<Member> {
    const res = await fetch(`/api/members/${id}`);
    if (!res.ok) {
      throw new Error("ไม่สามารถโหลดข้อมูลสมาชิกได้");
    }
    return (await res.json()) as Member;
  }

  async function openViewForm(member: Member) {
    setSelectedMember(null);
    setFormMode("view");
    setFormLoading(true);
    setFormOpen(true);
    try {
      setSelectedMember(await fetchFullMember(member.id));
    } catch {
      alert("ไม่สามารถโหลดข้อมูลสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
      setFormOpen(false);
    } finally {
      setFormLoading(false);
    }
  }

  async function openEditForm(member: Member) {
    setSelectedMember(null);
    setFormMode("edit");
    setFormLoading(true);
    setFormOpen(true);
    try {
      setSelectedMember(await fetchFullMember(member.id));
    } catch {
      alert("ไม่สามารถโหลดข้อมูลสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
      setFormOpen(false);
    } finally {
      setFormLoading(false);
    }
  }

  function openStatusDialog(member: Member) {
    setStatusMember(member);
    setStatusDialogOpen(true);
  }

  function openDeleteDialog(member: Member) {
    setDeleteMember(member);
    setDeleteDialogOpen(true);
  }

  async function handleFormSubmit(input: MemberInput) {
    if (formMode === "add") {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มสมาชิกได้");
      }
      setMembers((prev) => [...prev, data as Member]);
    } else if (formMode === "edit" && selectedMember) {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === data.id ? (data as Member) : m))
      );
    }
  }

  async function handleToggleStatus() {
    if (!statusMember) return;
    const nextStatus =
      statusMember.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/members/${statusMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setMembers((prev) =>
      prev.map((m) => (m.id === data.id ? (data as Member) : m))
    );
  }

  async function handleDelete() {
    if (!deleteMember) return;
    const res = await fetch(`/api/members/${deleteMember.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสมาชิกได้");
    }
    setMembers((prev) => prev.filter((m) => m.id !== deleteMember.id));
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ระบบสมาชิก"
        description="จัดการข้อมูลสมาชิกผู้ขายน้ำยางพารา"
        action={
          <Button variant="primary" onClick={openAddForm}>
            + เพิ่มสมาชิกใหม่
          </Button>
        }
      />

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาสมาชิก"
          placeholder="ค้นหาด้วยรหัส ชื่อ หรือเบอร์โทร"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <MemberTable
        members={filteredMembers}
        onView={openViewForm}
        onEdit={openEditForm}
        onToggleStatus={openStatusDialog}
        onDelete={openDeleteDialog}
      />

      <MemberFormDialog
        key={`${formMode}-${selectedMember?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        mode={formMode}
        member={selectedMember}
        loading={formLoading}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        onRequestEdit={
          formMode === "view" ? () => setFormMode("edit") : undefined
        }
      />

      <SuspendConfirmDialog
        open={statusDialogOpen}
        member={statusMember}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        member={deleteMember}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

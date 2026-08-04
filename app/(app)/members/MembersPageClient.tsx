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

  const [statusMember, setStatusMember] = useState<Member | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function loadMembers() {
    const res = await fetch("/api/members");
    const data = (await res.json()) as Member[];
    setMembers(data);
  }

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

  function openViewForm(member: Member) {
    setSelectedMember(member);
    setFormMode("view");
    setFormOpen(true);
  }

  function openEditForm(member: Member) {
    setSelectedMember(member);
    setFormMode("edit");
    setFormOpen(true);
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถเพิ่มสมาชิกได้");
      }
    } else if (formMode === "edit" && selectedMember) {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
    }
    await loadMembers();
  }

  async function handleToggleStatus() {
    if (!statusMember) return;
    const nextStatus =
      statusMember.status === "Active" ? "Inactive" : "Active";
    await fetch(`/api/members/${statusMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadMembers();
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
    await loadMembers();
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

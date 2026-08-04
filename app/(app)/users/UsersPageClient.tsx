"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserTable } from "@/components/users/UserTable";
import {
  UserFormDialog,
  UserFormMode,
} from "@/components/users/UserFormDialog";
import { SuspendConfirmDialog } from "@/components/users/SuspendConfirmDialog";
import type { User, UserInput } from "@/lib/types";

interface UsersPageClientProps {
  initialUsers: User[];
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>("add");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [statusUser, setStatusUser] = useState<User | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as User[];
    setUsers(data);
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.firstName, u.lastName, u.username, u.email]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, search]);

  function openAddForm() {
    setSelectedUser(null);
    setFormMode("add");
    setFormOpen(true);
  }

  function openViewForm(user: User) {
    setSelectedUser(user);
    setFormMode("view");
    setFormOpen(true);
  }

  function openEditForm(user: User) {
    setSelectedUser(user);
    setFormMode("edit");
    setFormOpen(true);
  }

  function openStatusDialog(user: User) {
    setStatusUser(user);
    setStatusDialogOpen(true);
  }

  async function handleFormSubmit(input: UserInput) {
    if (formMode === "add") {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถเพิ่มผู้ใช้งานได้");
      }
    } else if (formMode === "edit" && selectedUser) {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
    }
    await loadUsers();
  }

  async function handleToggleStatus() {
    if (!statusUser) return;
    const nextStatus = statusUser.status === "Active" ? "Inactive" : "Active";
    await fetch(`/api/users/${statusUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadUsers();
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ตรวจสอบสิทธิ์ผู้ใช้งาน"
        description="จัดการบัญชีผู้ใช้งานและบทบาทสำหรับการเข้าถึงระบบ"
        action={
          <Button variant="primary" onClick={openAddForm}>
            + เพิ่มผู้ใช้งานใหม่
          </Button>
        }
      />

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาผู้ใช้งาน"
          placeholder="ค้นหาด้วยชื่อ ชื่อผู้ใช้งาน หรืออีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <UserTable
        users={filteredUsers}
        onView={openViewForm}
        onEdit={openEditForm}
        onToggleStatus={openStatusDialog}
      />

      <UserFormDialog
        key={`${formMode}-${selectedUser?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        mode={formMode}
        user={selectedUser}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        onRequestEdit={
          formMode === "view" ? () => setFormMode("edit") : undefined
        }
      />

      <SuspendConfirmDialog
        open={statusDialogOpen}
        user={statusUser}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}

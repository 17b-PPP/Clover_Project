"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContractTable } from "@/components/contracts/ContractTable";
import {
  ContractFormDialog,
  ContractFormMode,
} from "@/components/contracts/ContractFormDialog";
import { SuspendConfirmDialog } from "@/components/contracts/SuspendConfirmDialog";
import { DeleteConfirmDialog } from "@/components/contracts/DeleteConfirmDialog";
import type { Contract, ContractInput } from "@/lib/types";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ContractFormMode>("add");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );

  const [statusContract, setStatusContract] = useState<Contract | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function loadContracts() {
    setLoading(true);
    const res = await fetch("/api/contracts");
    const data = (await res.json()) as Contract[];
    setContracts(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data: Contract[]) => {
        if (cancelled) return;
        setContracts(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) =>
      [
        c.pairCode,
        c.member.firstName,
        c.member.lastName,
        c.member.code,
        c.employee.firstName,
        c.employee.lastName,
        c.employee.code,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contracts, search]);

  function openAddForm() {
    setSelectedContract(null);
    setFormMode("add");
    setFormOpen(true);
  }

  function openViewForm(contract: Contract) {
    setSelectedContract(contract);
    setFormMode("view");
    setFormOpen(true);
  }

  function openEditForm(contract: Contract) {
    setSelectedContract(contract);
    setFormMode("edit");
    setFormOpen(true);
  }

  function openStatusDialog(contract: Contract) {
    setStatusContract(contract);
    setStatusDialogOpen(true);
  }

  function openDeleteDialog(contract: Contract) {
    setDeleteContract(contract);
    setDeleteDialogOpen(true);
  }

  async function handleFormSubmit(input: ContractInput) {
    if (formMode === "add") {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถเพิ่มสัญญาจ้างได้");
      }
    } else if (formMode === "edit" && selectedContract) {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
    }
    await loadContracts();
  }

  async function handleToggleStatus() {
    if (!statusContract) return;
    const nextStatus =
      statusContract.status === "Active" ? "Inactive" : "Active";
    await fetch(`/api/contracts/${statusContract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadContracts();
  }

  async function handleDelete() {
    if (!deleteContract) return;
    const res = await fetch(`/api/contracts/${deleteContract.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบสัญญาจ้างได้");
    }
    await loadContracts();
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ระบบสัญญาจ้าง"
        description="จัดการการจับคู่ระหว่างสมาชิกและลูกจ้าง พร้อมสัดส่วนแบ่งรายได้"
        action={
          <Button variant="primary" onClick={openAddForm}>
            + เพิ่มสัญญาจ้างใหม่
          </Button>
        }
      />

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาสัญญาจ้าง"
          placeholder="ค้นหาด้วยรหัสจับคู่ ชื่อ หรือรหัสสมาชิก/ลูกจ้าง"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <ContractTable
          contracts={filteredContracts}
          onView={openViewForm}
          onEdit={openEditForm}
          onToggleStatus={openStatusDialog}
          onDelete={openDeleteDialog}
        />
      )}

      <ContractFormDialog
        key={`${formMode}-${selectedContract?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        mode={formMode}
        contract={selectedContract}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        onRequestEdit={
          formMode === "view" ? () => setFormMode("edit") : undefined
        }
      />

      <SuspendConfirmDialog
        open={statusDialogOpen}
        contract={statusContract}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        contract={deleteContract}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

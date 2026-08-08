"use client";

import { useMemo, useState } from "react";
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
import { ContractHistoryDialog } from "@/components/contracts/ContractHistoryDialog";
import type {
  Contract,
  ContractInput,
  EmployeeOption,
  MemberOption,
} from "@/lib/types";

interface ContractsPageClientProps {
  initialContracts: Contract[];
  members: MemberOption[];
  employees: EmployeeOption[];
}

export function ContractsPageClient({
  initialContracts,
  members,
  employees,
}: ContractsPageClientProps) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
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

  const [historyContract, setHistoryContract] = useState<Contract | null>(
    null
  );
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [showExpired, setShowExpired] = useState(false);

  async function loadContracts() {
    const res = await fetch("/api/contracts");
    const data = (await res.json()) as Contract[];
    setContracts(data);
  }

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts
      .filter((c) => showExpired || c.contractEndDate === null)
      .filter((c) => {
        if (!q) return true;
        return [
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
          .includes(q);
      });
  }, [contracts, search, showExpired]);

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

  function openHistoryDialog(contract: Contract) {
    setHistoryContract(contract);
    setHistoryDialogOpen(true);
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

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-sm flex-1">
          <Input
            label="ค้นหาสัญญาจ้าง"
            placeholder="ค้นหาด้วยรหัสจับคู่ ชื่อ หรือรหัสสมาชิก/ลูกจ้าง"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />
          แสดงสัญญาที่สิ้นสุดแล้ว
        </label>
      </div>

      <ContractTable
        contracts={filteredContracts}
        onView={openViewForm}
        onEdit={openEditForm}
        onToggleStatus={openStatusDialog}
        onDelete={openDeleteDialog}
        onViewHistory={openHistoryDialog}
      />

      <ContractFormDialog
        key={`${formMode}-${selectedContract?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        mode={formMode}
        contract={selectedContract}
        members={members}
        employees={employees}
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

      <ContractHistoryDialog
        key={historyContract?.id ?? "none"}
        open={historyDialogOpen}
        contract={historyContract}
        onClose={() => setHistoryDialogOpen(false)}
      />
    </div>
  );
}

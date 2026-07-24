"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContractTable } from "@/components/contracts/ContractTable";
import {
  ContractFormDialog,
  ContractFormMode,
} from "@/components/contracts/ContractFormDialog";
import { SuspendConfirmDialog } from "@/components/contracts/SuspendConfirmDialog";
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

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            ระบบสัญญาจ้าง
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            จัดการการจับคู่ระหว่างสมาชิกและลูกจ้าง พร้อมสัดส่วนแบ่งรายได้
          </p>
        </div>
        <Button variant="primary" onClick={openAddForm}>
          + เพิ่มสัญญาจ้างใหม่
        </Button>
      </div>

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาสัญญาจ้าง"
          placeholder="ค้นหาด้วยรหัสจับคู่ ชื่อ หรือรหัสสมาชิก/ลูกจ้าง"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
      ) : (
        <ContractTable
          contracts={filteredContracts}
          onView={openViewForm}
          onEdit={openEditForm}
          onToggleStatus={openStatusDialog}
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
    </div>
  );
}

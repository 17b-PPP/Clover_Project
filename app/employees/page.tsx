"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import {
  EmployeeFormDialog,
  EmployeeFormMode,
} from "@/components/employees/EmployeeFormDialog";
import { SuspendConfirmDialog } from "@/components/employees/SuspendConfirmDialog";
import type { Employee, EmployeeInput } from "@/lib/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<EmployeeFormMode>("add");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    const res = await fetch("/api/employees");
    const data = (await res.json()) as Employee[];
    setEmployees(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => {
        if (cancelled) return;
        setEmployees(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.employeeCode, e.firstName, e.lastName, e.phone]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  function openAddForm() {
    setSelectedEmployee(null);
    setFormMode("add");
    setFormOpen(true);
  }

  function openViewForm(employee: Employee) {
    setSelectedEmployee(employee);
    setFormMode("view");
    setFormOpen(true);
  }

  function openEditForm(employee: Employee) {
    setSelectedEmployee(employee);
    setFormMode("edit");
    setFormOpen(true);
  }

  function openStatusDialog(employee: Employee) {
    setStatusEmployee(employee);
    setStatusDialogOpen(true);
  }

  async function handleFormSubmit(input: EmployeeInput) {
    if (formMode === "add") {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถเพิ่มลูกจ้างได้");
      }
    } else if (formMode === "edit" && selectedEmployee) {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
    }
    await loadEmployees();
  }

  async function handleToggleStatus() {
    if (!statusEmployee) return;
    const nextStatus =
      statusEmployee.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await fetch(`/api/employees/${statusEmployee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadEmployees();
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            ระบบลูกจ้าง
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            จัดการข้อมูลลูกจ้างของกิจการ
          </p>
        </div>
        <Button variant="primary" onClick={openAddForm}>
          + เพิ่มลูกจ้างใหม่
        </Button>
      </div>

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาลูกจ้าง"
          placeholder="ค้นหาด้วยรหัส ชื่อ หรือเบอร์โทร"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
      ) : (
        <EmployeeTable
          employees={filteredEmployees}
          onView={openViewForm}
          onEdit={openEditForm}
          onToggleStatus={openStatusDialog}
        />
      )}

      <EmployeeFormDialog
        key={`${formMode}-${selectedEmployee?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        mode={formMode}
        employee={selectedEmployee}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        onRequestEdit={
          formMode === "view" ? () => setFormMode("edit") : undefined
        }
      />

      <SuspendConfirmDialog
        open={statusDialogOpen}
        employee={statusEmployee}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}

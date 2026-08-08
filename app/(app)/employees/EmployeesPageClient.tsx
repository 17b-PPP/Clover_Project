"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import {
  EmployeeFormDialog,
  EmployeeFormMode,
} from "@/components/employees/EmployeeFormDialog";
import { SuspendConfirmDialog } from "@/components/employees/SuspendConfirmDialog";
import { DeleteConfirmDialog } from "@/components/employees/DeleteConfirmDialog";
import type { Employee, EmployeeInput } from "@/lib/types";

interface EmployeesPageClientProps {
  initialEmployees: Employee[];
}

export function EmployeesPageClient({
  initialEmployees,
}: EmployeesPageClientProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<EmployeeFormMode>("add");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  function openDeleteDialog(employee: Employee) {
    setDeleteEmployee(employee);
    setDeleteDialogOpen(true);
  }

  async function handleFormSubmit(input: EmployeeInput) {
    if (formMode === "add") {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มลูกจ้างได้");
      }
      setEmployees((prev) => [...prev, data as Employee]);
    } else if (formMode === "edit" && selectedEmployee) {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลได้");
      }
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === data.id ? (data as Employee) : emp))
      );
    }
  }

  async function handleToggleStatus() {
    if (!statusEmployee) return;
    const nextStatus =
      statusEmployee.status === "Active" ? "Inactive" : "Active";
    const res = await fetch(`/api/employees/${statusEmployee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === data.id ? (data as Employee) : emp))
    );
  }

  async function handleDelete() {
    if (!deleteEmployee) return;
    const res = await fetch(`/api/employees/${deleteEmployee.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "ไม่สามารถลบลูกจ้างได้");
    }
    setEmployees((prev) => prev.filter((emp) => emp.id !== deleteEmployee.id));
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title="ระบบลูกจ้าง"
        description="จัดการข้อมูลลูกจ้างของกิจการ"
        action={
          <Button variant="primary" onClick={openAddForm}>
            + เพิ่มลูกจ้างใหม่
          </Button>
        }
      />

      <div className="mb-5 max-w-sm">
        <Input
          label="ค้นหาลูกจ้าง"
          placeholder="ค้นหาด้วยรหัส ชื่อ หรือเบอร์โทร"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <EmployeeTable
        employees={filteredEmployees}
        onView={openViewForm}
        onEdit={openEditForm}
        onToggleStatus={openStatusDialog}
        onDelete={openDeleteDialog}
      />

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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        employee={deleteEmployee}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

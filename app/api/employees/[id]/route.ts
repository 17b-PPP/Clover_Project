import { NextRequest, NextResponse } from "next/server";
import {
  getEmployee,
  setEmployeeStatus,
  updateEmployee,
} from "@/lib/data/employees";
import type { EmployeeInput, EmployeeStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(employee);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as Partial<EmployeeInput> & {
    status?: EmployeeStatus;
  };

  if (body.status) {
    const updated = await setEmployeeStatus(id, body.status);
    if (!updated) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  }

  const updated = await updateEmployee(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

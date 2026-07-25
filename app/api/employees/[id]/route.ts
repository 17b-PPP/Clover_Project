import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  deleteEmployee,
  getEmployee,
  setEmployeeStatus,
  updateEmployee,
} from "@/lib/data/employees";
import { handleRouteError } from "@/lib/api-error";
import type { EmployeeInput, EmployeeStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(employee);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    if (employee.status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "ต้องระงับลูกจ้างก่อนจึงจะลบได้" },
        { status: 400 }
      );
    }

    try {
      await deleteEmployee(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return NextResponse.json(
          { error: "ไม่สามารถลบลูกจ้างได้ เนื่องจากมีสัญญาจ้างที่เกี่ยวข้องอยู่" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

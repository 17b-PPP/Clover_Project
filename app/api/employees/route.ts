import { NextRequest, NextResponse } from "next/server";
import { createEmployee, getEmployees } from "@/lib/data/employees";
import type { EmployeeInput } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getEmployees());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<EmployeeInput>;

  const requiredFields: (keyof EmployeeInput)[] = [
    "firstName",
    "lastName",
    "idCardNumber",
    "phone",
    "address",
    "postalCode",
  ];
  const missing = requiredFields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const employee = await createEmployee({
    firstName: body.firstName!,
    lastName: body.lastName!,
    idCardNumber: body.idCardNumber!,
    phone: body.phone!,
    address: body.address!,
    postalCode: body.postalCode!,
    photoUrl: body.photoUrl ?? null,
  });

  return NextResponse.json(employee, { status: 201 });
}

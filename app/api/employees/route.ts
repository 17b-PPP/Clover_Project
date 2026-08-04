import { NextRequest, NextResponse } from "next/server";
import { createEmployee, getEmployees } from "@/lib/data/employees";
import { handleRouteError } from "@/lib/api-error";
import { isValidIdCardNumber, isValidPhone } from "@/lib/validate";
import { logActivity } from "@/lib/activity-log";
import type { EmployeeInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getEmployees());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<EmployeeInput>;

    const requiredFields: (keyof EmployeeInput)[] = [
      "firstName",
      "lastName",
      "idCardNumber",
      "dateOfBirth",
      "phone",
      "address",
      "district",
      "province",
      "postalCode",
    ];
    const missing = requiredFields.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isValidIdCardNumber(body.idCardNumber!)) {
      return NextResponse.json(
        { error: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" },
        { status: 400 }
      );
    }
    if (!isValidPhone(body.phone!)) {
      return NextResponse.json(
        { error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก" },
        { status: 400 }
      );
    }

    const employee = await createEmployee({
      firstName: body.firstName!,
      lastName: body.lastName!,
      idCardNumber: body.idCardNumber!,
      dateOfBirth: body.dateOfBirth!,
      phone: body.phone!,
      address: body.address!,
      district: body.district!,
      province: body.province!,
      postalCode: body.postalCode!,
      photoUrl: body.photoUrl ?? null,
    });

    await logActivity({
      action: "CREATE_EMPLOYEE",
      targetType: "EMPLOYEE",
      targetId: employee.id,
      description: `เพิ่มลูกจ้างใหม่ ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

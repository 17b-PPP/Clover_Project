import { NextRequest, NextResponse } from "next/server";
import {
  deleteContract,
  getContract,
  renewContract,
  setContractStatus,
} from "@/lib/data/contracts";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";
import type { ContractInput, ContractStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contract = await getContract(id);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(contract);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<ContractInput> & {
      status?: ContractStatus;
    };

    if (body.status) {
      const updated = await setContractStatus(id, body.status);
      if (!updated) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }
      await logActivity({
        action: "SUSPEND_CONTRACT",
        targetType: "CONTRACT",
        targetId: updated.id,
        description: `${
          body.status === "Inactive" ? "ระงับ" : "เปิดใช้งาน"
        }สัญญาจ้าง ${updated.pairCode}`,
      });
      return NextResponse.json(updated);
    }

    if (body.memberShare === undefined || body.employeeShare === undefined) {
      return NextResponse.json(
        { error: "ต้องระบุสัดส่วนใหม่เพื่อต่อสัญญา" },
        { status: 400 }
      );
    }

    const renewed = await renewContract(id, {
      memberShare: body.memberShare,
      employeeShare: body.employeeShare,
    });
    if (!renewed) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    await logActivity({
      action: "UPDATE_CONTRACT",
      targetType: "CONTRACT",
      targetId: renewed.id,
      description: `ต่อสัญญาจ้าง ${renewed.pairCode} ด้วยสัดส่วนใหม่ (เจ้าของสวน ${renewed.memberShare}% / ลูกจ้าง ${renewed.employeeShare}%)`,
    });
    return NextResponse.json(renewed, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contract = await getContract(id);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    if (contract.status !== "Inactive") {
      return NextResponse.json(
        { error: "ต้องระงับสัญญาก่อนจึงจะลบได้" },
        { status: 400 }
      );
    }

    await deleteContract(id);

    await logActivity({
      action: "DELETE_CONTRACT",
      targetType: "CONTRACT",
      targetId: contract.id,
      description: `ลบสัญญาจ้าง ${contract.pairCode}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

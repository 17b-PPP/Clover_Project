import { NextRequest, NextResponse } from "next/server";
import {
  getContract,
  setContractStatus,
  updateContract,
} from "@/lib/data/contracts";
import { handleRouteError } from "@/lib/api-error";
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
      return NextResponse.json(updated);
    }

    const updated = await updateContract(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

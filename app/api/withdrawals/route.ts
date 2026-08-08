import { NextRequest, NextResponse } from "next/server";
import {
  createWithdrawal,
  getWithdrawals,
  WithdrawalError,
} from "@/lib/data/withdrawals";
import { handleRouteError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-log";
import type { WithdrawalInput } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getWithdrawals());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WithdrawalInput>;

    if (!body.memberCode || body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: "กรุณากรอกรหัสสมาชิกและยอดเงินที่ต้องการเบิก" },
        { status: 400 }
      );
    }

    const withdrawal = await createWithdrawal({
      memberCode: body.memberCode,
      amount: body.amount,
    });

    await logActivity({
      action: "CREATE_WITHDRAWAL",
      targetType: "WITHDRAWAL",
      targetId: withdrawal.id,
      description: `เบิกเงิน ${withdrawal.withdrawalCode} ให้ ${withdrawal.memberCode} (${withdrawal.memberName}) จำนวน ${withdrawal.amount} บาท`,
    });

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}

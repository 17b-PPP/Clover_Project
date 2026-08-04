import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/data/audit-log";
import { handleRouteError } from "@/lib/api-error";

export async function GET() {
  try {
    return NextResponse.json(await getAuditLogs());
  } catch (error) {
    return handleRouteError(error);
  }
}

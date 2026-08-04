import { getAuditLogs } from "@/lib/data/audit-log";
import { AuditLogPageClient } from "./AuditLogPageClient";

export default async function AuditLogPage() {
  const entries = await getAuditLogs();
  return <AuditLogPageClient entries={entries} />;
}

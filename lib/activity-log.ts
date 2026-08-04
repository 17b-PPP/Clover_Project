import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { ActionType, TargetType } from "@prisma/client";

export async function logActivity(params: {
  action: ActionType;
  targetType?: TargetType;
  targetId?: string;
  description?: string;
}): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await prisma.activityLog.create({
    data: {
      staffId: session.staffId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      description: params.description,
    },
  });
}

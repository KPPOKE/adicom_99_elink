import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: number | null;
  userEmail?: string | null;
  outletId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: Prisma.InputJsonObject;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        outletId: input.outletId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined
      }
    });
  } catch {
    // Audit logging must not break operational flows.
  }
}

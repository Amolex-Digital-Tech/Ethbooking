import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@/lib/generated/prisma/client";

type AuditInput = {
  actorProfileId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorProfileId: input.actorProfileId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    // Never hide a successful business operation because audit storage failed.
    console.error("Unable to write admin audit log", error);
  }
}

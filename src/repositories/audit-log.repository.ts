import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateAuditLogInput = {
  actorUserId?: string | null;
  actorType: "USER" | "DEVICE" | "SYSTEM";
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata,
    },
  });
}

export async function listAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  entityType?: string;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where: Prisma.AuditLogWhereInput = {
    ...(params.action ? { action: params.action } : {}),
    ...(params.entityType ? { entityType: params.entityType } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actorUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
  ]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

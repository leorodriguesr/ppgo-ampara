import { AppError, NotFoundError } from "@/lib/errors";
import type {
  ChangeStatusInput,
  CreateProtectionOrderInput,
  ReopenProtectionOrderInput,
  UpdateProtectionOrderInput,
} from "@/modules/protection-orders/schemas";
import { findInmateById } from "@/repositories/inmate.repository";
import {
  createProtectionOrder,
  deleteProtectionOrderById,
  findProtectionOrderById,
  findProtectionOrderByJudicialRef,
  listProtectionOrders,
  reopenProtectionOrder,
  updateProtectionOrder,
  updateProtectionOrderStatus,
  type ProtectionOrderListParams,
} from "@/repositories/protection-order.repository";
import { findVictimById } from "@/repositories/victim.repository";
import {
  ensureProtectionOrderNotExpired,
  expireDueProtectionOrders,
} from "@/services/protection-order-expiry";
import { writeAuditLog } from "@/services/write-audit-log";
import type { ProtectionOrderStatus } from "@/generated/prisma/client";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

async function assertVictimAndInmateExist(
  victimId: string,
  inmateId: string,
) {
  const [victim, inmate] = await Promise.all([
    findVictimById(victimId),
    findInmateById(inmateId),
  ]);

  if (!victim) {
    throw new NotFoundError("Vítima não encontrada");
  }
  if (!inmate) {
    throw new NotFoundError("Preso não encontrado");
  }
}

async function assertJudicialRefUnique(
  judicialRef: string,
  excludeId?: string,
) {
  const existing = await findProtectionOrderByJudicialRef(
    judicialRef,
    excludeId,
  );
  if (existing) {
    throw new AppError(
      "JUDICIAL_REF_EXISTS",
      "Já existe uma medida protetiva para este processo judicial",
      409,
    );
  }
}

function assertDateRange(
  startsAt?: Date | null,
  endsAt?: Date | null,
) {
  if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "A data de término deve ser igual ou posterior ao início",
      400,
    );
  }
}

function assertStatusTransition(
  current: ProtectionOrderStatus,
  next: ChangeStatusInput["status"],
) {
  if (current === "CLOSED") {
    throw new AppError(
      "INVALID_STATUS_TRANSITION",
      "Medida já encerrada; não é possível alterar o status",
      400,
    );
  }

  if (next === "AWAITING_PAIRING") {
    if (current !== "DRAFT") {
      throw new AppError(
        "INVALID_STATUS_TRANSITION",
        "Somente medidas em rascunho podem ser liberadas para pareamento",
        400,
      );
    }
    return;
  }

  // CLOSED: permitido a partir de qualquer status não encerrado
  if (next === "CLOSED") {
    return;
  }

  throw new AppError(
    "INVALID_STATUS_TRANSITION",
    "Transição de status não permitida nesta etapa",
    400,
  );
}

export async function createProtectionOrderService(
  input: CreateProtectionOrderInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  await assertVictimAndInmateExist(input.victimId, input.inmateId);
  assertDateRange(input.startsAt, input.endsAt);
  await assertJudicialRefUnique(input.judicialRef);

  const order = await createProtectionOrder({
    victimId: input.victimId,
    inmateId: input.inmateId,
    radiusMeters: input.radiusMeters,
    isSimulation: input.isSimulation,
    judicialRef: input.judicialRef,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdById: actorUserId,
  });

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PROTECTION_ORDER_CREATED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      victimId: order.victimId,
      inmateId: order.inmateId,
      radiusMeters: order.radiusMeters,
      isSimulation: order.isSimulation,
      status: order.status,
    },
  });

  return order;
}

export async function updateProtectionOrderService(
  id: string,
  input: UpdateProtectionOrderInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const existingRaw = await findProtectionOrderById(id);
  if (!existingRaw) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  const existing = await ensureProtectionOrderNotExpired(existingRaw);

  if (existing.status === "CLOSED") {
    throw new AppError(
      "ORDER_CLOSED",
      "Medida encerrada. Use a reabertura com novo prazo para reativá-la.",
      400,
    );
  }

  const nextStartsAt =
    input.startsAt !== undefined ? input.startsAt : existing.startsAt;
  const nextEndsAt =
    input.endsAt !== undefined ? input.endsAt : existing.endsAt;
  assertDateRange(nextStartsAt, nextEndsAt);

  if (input.judicialRef) {
    await assertJudicialRefUnique(input.judicialRef, id);
  }

  let order = await updateProtectionOrder(id, {
    radiusMeters: input.radiusMeters,
    isSimulation: input.isSimulation,
    judicialRef:
      input.judicialRef === undefined ? undefined : (input.judicialRef ?? null),
    startsAt:
      input.startsAt === undefined ? undefined : (input.startsAt ?? null),
    endsAt: input.endsAt === undefined ? undefined : (input.endsAt ?? null),
  });

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PROTECTION_ORDER_UPDATED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      changes: input,
    },
  });

  // Se o novo prazo já passou, encerra na hora.
  order = await ensureProtectionOrderNotExpired(order);

  return order;
}

export async function changeProtectionOrderStatusService(
  id: string,
  input: ChangeStatusInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const existingRaw = await findProtectionOrderById(id);
  if (!existingRaw) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  const existing = await ensureProtectionOrderNotExpired(existingRaw);

  assertStatusTransition(existing.status, input.status);

  if (existing.status === input.status) {
    return existing;
  }

  const order = await updateProtectionOrderStatus(id, input.status);

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PROTECTION_ORDER_STATUS_CHANGED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      from: existing.status,
      to: order.status,
    },
  });

  return order;
}

/**
 * Reabre medida encerrada (prazo vencido ou encerramento manual) com novo prazo.
 * Volta para ACTIVE; o acesso do app anterior volta a funcionar se o device ainda estiver ACTIVE.
 */
export async function reopenProtectionOrderService(
  id: string,
  input: ReopenProtectionOrderInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const existing = await findProtectionOrderById(id);
  if (!existing) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  if (existing.status !== "CLOSED") {
    throw new AppError(
      "ORDER_NOT_CLOSED",
      "Somente medidas encerradas podem ser reabertas",
      400,
    );
  }

  if (
    existing.startsAt &&
    input.endsAt.getTime() < existing.startsAt.getTime()
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "A data de término deve ser igual ou posterior ao início",
      400,
    );
  }

  const order = await reopenProtectionOrder(id, input.endsAt, "ACTIVE");

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PROTECTION_ORDER_STATUS_CHANGED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      from: "CLOSED",
      to: "ACTIVE",
      reason: "reopened_with_extended_deadline",
      endsAt: input.endsAt.toISOString(),
    },
  });

  return order;
}

export async function getProtectionOrderService(id: string) {
  const order = await findProtectionOrderById(id);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }
  return ensureProtectionOrderNotExpired(order);
}

export async function listProtectionOrdersService(
  params: ProtectionOrderListParams,
) {
  await expireDueProtectionOrders();
  return listProtectionOrders(params);
}

export async function deleteProtectionOrderService(id: string) {
  const existing = await findProtectionOrderById(id);
  if (!existing) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  await deleteProtectionOrderById(id);
  return { id };
}

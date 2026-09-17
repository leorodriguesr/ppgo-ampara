import { NotFoundError } from "@/lib/errors";
import type {
  CreateVictimInput,
  UpdateVictimInput,
} from "@/modules/victims/schemas";
import {
  createVictim,
  deleteVictimById,
  findVictimById,
  listVictims,
  updateVictim,
  type VictimListParams,
} from "@/repositories/victim.repository";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export async function createVictimService(
  input: CreateVictimInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const victim = await createVictim({
    fullName: input.fullName,
    phone: input.phone,
    document: input.document,
    notes: input.notes,
    createdById: actorUserId,
  });

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "VICTIM_CREATED",
    entityType: "Victim",
    entityId: victim.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: victim.publicId,
      fullName: victim.fullName,
    },
  });

  return victim;
}

export async function updateVictimService(
  id: string,
  input: UpdateVictimInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const existing = await findVictimById(id);
  if (!existing) {
    throw new NotFoundError("Vítima não encontrada");
  }

  const victim = await updateVictim(id, {
    fullName: input.fullName,
    phone: input.phone === undefined ? undefined : (input.phone ?? null),
    document:
      input.document === undefined ? undefined : (input.document ?? null),
    notes: input.notes === undefined ? undefined : (input.notes ?? null),
  });

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "VICTIM_UPDATED",
    entityType: "Victim",
    entityId: victim.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: victim.publicId,
      changes: input,
    },
  });

  return victim;
}

export async function getVictimService(id: string) {
  const victim = await findVictimById(id);
  if (!victim) {
    throw new NotFoundError("Vítima não encontrada");
  }
  return victim;
}

export async function listVictimsService(params: VictimListParams) {
  return listVictims(params);
}

export async function deleteVictimService(id: string) {
  const existing = await findVictimById(id);
  if (!existing) {
    throw new NotFoundError("Vítima não encontrada");
  }

  await deleteVictimById(id);
  return { id };
}

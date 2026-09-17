import { Prisma } from "@/generated/prisma/client";
import { AppError, NotFoundError } from "@/lib/errors";
import type {
  CreateInmateInput,
  UpdateInmateInput,
} from "@/modules/inmates/schemas";
import {
  createInmate,
  deleteInmateById,
  findInmateByExternalId,
  findInmateById,
  listInmates,
  updateInmate,
  type InmateListParams,
} from "@/repositories/inmate.repository";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

function isExternalIdConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function assertExternalIdAvailable(
  externalInmateId: string,
  excludeId?: string,
) {
  const existing = await findInmateByExternalId(externalInmateId);
  if (existing && existing.id !== excludeId) {
    throw new AppError(
      "EXTERNAL_ID_EXISTS",
      "Já existe um preso com este ID de detento/tornozeleira",
      409,
    );
  }
}

export async function createInmateService(
  input: CreateInmateInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  await assertExternalIdAvailable(input.externalInmateId);

  try {
    const inmate = await createInmate({
      fullName: input.fullName,
      externalInmateId: input.externalInmateId,
      document: input.document,
      notes: input.notes,
      createdById: actorUserId,
    });

    await writeAuditLog({
      actorUserId,
      actorType: "USER",
      action: "INMATE_CREATED",
      entityType: "Inmate",
      entityId: inmate.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        publicId: inmate.publicId,
        fullName: inmate.fullName,
        externalInmateId: inmate.externalInmateId,
      },
    });

    return inmate;
  } catch (error) {
    if (isExternalIdConflict(error)) {
      throw new AppError(
        "EXTERNAL_ID_EXISTS",
        "Já existe um preso com este ID de detento/tornozeleira",
        409,
      );
    }
    throw error;
  }
}

export async function updateInmateService(
  id: string,
  input: UpdateInmateInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const existing = await findInmateById(id);
  if (!existing) {
    throw new NotFoundError("Preso não encontrado");
  }

  if (input.externalInmateId) {
    await assertExternalIdAvailable(input.externalInmateId, id);
  }

  try {
    const inmate = await updateInmate(id, {
      fullName: input.fullName,
      externalInmateId: input.externalInmateId,
      document:
        input.document === undefined ? undefined : (input.document ?? null),
      notes: input.notes === undefined ? undefined : (input.notes ?? null),
    });

    await writeAuditLog({
      actorUserId,
      actorType: "USER",
      action: "INMATE_UPDATED",
      entityType: "Inmate",
      entityId: inmate.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        publicId: inmate.publicId,
        changes: input,
      },
    });

    return inmate;
  } catch (error) {
    if (isExternalIdConflict(error)) {
      throw new AppError(
        "EXTERNAL_ID_EXISTS",
        "Já existe um preso com este ID de detento/tornozeleira",
        409,
      );
    }
    throw error;
  }
}

export async function getInmateService(id: string) {
  const inmate = await findInmateById(id);
  if (!inmate) {
    throw new NotFoundError("Preso não encontrado");
  }
  return inmate;
}

export async function listInmatesService(params: InmateListParams) {
  return listInmates(params);
}

export async function deleteInmateService(id: string) {
  const existing = await findInmateById(id);
  if (!existing) {
    throw new NotFoundError("Preso não encontrado");
  }

  await deleteInmateById(id);
  return { id };
}

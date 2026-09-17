import type { AlertStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AlertListParams = {
  status?: AlertStatus;
  protectionOrderId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

const alertInclude = {
  protectionOrder: {
    select: {
      id: true,
      publicId: true,
      status: true,
      radiusMeters: true,
      judicialRef: true,
      geofenceState: true,
      victim: {
        select: { id: true, publicId: true, fullName: true },
      },
      inmate: {
        select: {
          id: true,
          publicId: true,
          fullName: true,
          externalInmateId: true,
        },
      },
    },
  },
} satisfies Prisma.AlertInclude;

export type CreateAlertInput = {
  protectionOrderId: string;
  triggerDistanceM: number;
  lastDistanceM: number;
  inmateLatitude: number;
  inmateLongitude: number;
  victimLatitude: number;
  victimLongitude: number;
  externalTimestamp?: Date | null;
  consecutiveHits?: number;
};

export type RefreshAlertInput = {
  lastDistanceM: number;
  inmateLatitude: number;
  inmateLongitude: number;
  victimLatitude: number;
  victimLongitude: number;
  externalTimestamp?: Date | null;
};

export async function createAlert(data: CreateAlertInput) {
  return prisma.alert.create({
    data: {
      protectionOrderId: data.protectionOrderId,
      status: "OPEN",
      triggerDistanceM: data.triggerDistanceM,
      lastDistanceM: data.lastDistanceM,
      inmateLatitude: data.inmateLatitude,
      inmateLongitude: data.inmateLongitude,
      victimLatitude: data.victimLatitude,
      victimLongitude: data.victimLongitude,
      externalTimestamp: data.externalTimestamp ?? null,
      consecutiveHits: data.consecutiveHits ?? 2,
    },
    include: alertInclude,
  });
}

export async function findOpenAlertByOrderId(protectionOrderId: string) {
  return prisma.alert.findFirst({
    where: {
      protectionOrderId,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
    include: alertInclude,
  });
}

export async function refreshAlert(id: string, data: RefreshAlertInput) {
  return prisma.alert.update({
    where: { id },
    data: {
      lastDistanceM: data.lastDistanceM,
      inmateLatitude: data.inmateLatitude,
      inmateLongitude: data.inmateLongitude,
      victimLatitude: data.victimLatitude,
      victimLongitude: data.victimLongitude,
      externalTimestamp: data.externalTimestamp ?? undefined,
    },
    include: alertInclude,
  });
}

export async function resolveAlert(
  id: string,
  status: Extract<AlertStatus, "RESOLVED" | "FALSE_POSITIVE"> = "RESOLVED",
) {
  return prisma.alert.update({
    where: { id },
    data: {
      status,
      resolvedAt: new Date(),
    },
    include: alertInclude,
  });
}

export async function findAlertById(id: string) {
  return prisma.alert.findUnique({
    where: { id },
    include: alertInclude,
  });
}

export async function listAlerts(params: AlertListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim();

  const where: Prisma.AlertWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.protectionOrderId
      ? { protectionOrderId: params.protectionOrderId }
      : {}),
    ...(q
      ? {
          OR: [
            { publicId: { contains: q, mode: "insensitive" } },
            {
              protectionOrder: {
                judicialRef: { contains: q, mode: "insensitive" },
              },
            },
            {
              protectionOrder: {
                publicId: { contains: q, mode: "insensitive" },
              },
            },
            {
              protectionOrder: {
                victim: { fullName: { contains: q, mode: "insensitive" } },
              },
            },
            {
              protectionOrder: {
                inmate: { fullName: { contains: q, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: alertInclude,
    }),
  ]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

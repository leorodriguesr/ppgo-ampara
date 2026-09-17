import type {
  GeofenceState,
  Prisma,
  ProtectionOrderStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProtectionOrderListParams = {
  q?: string;
  status?: ProtectionOrderStatus;
  page?: number;
  pageSize?: number;
};

const orderInclude = {
  victim: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      phone: true,
    },
  },
  inmate: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      externalInmateId: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  _count: {
    select: {
      devices: true,
      alerts: true,
      pairingTokens: true,
    },
  },
} satisfies Prisma.ProtectionOrderInclude;

export async function createProtectionOrder(data: {
  victimId: string;
  inmateId: string;
  radiusMeters: number;
  isSimulation?: boolean;
  judicialRef: string;
  startsAt?: Date;
  endsAt: Date;
  createdById: string;
}) {
  return prisma.protectionOrder.create({
    data: {
      victimId: data.victimId,
      inmateId: data.inmateId,
      radiusMeters: data.radiusMeters,
      isSimulation: data.isSimulation ?? true,
      judicialRef: data.judicialRef,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: "AWAITING_PAIRING",
      createdById: data.createdById,
    },
    include: orderInclude,
  });
}

export async function updateProtectionOrder(
  id: string,
  data: {
    radiusMeters?: number;
    isSimulation?: boolean;
    judicialRef?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
) {
  return prisma.protectionOrder.update({
    where: { id },
    data,
    include: orderInclude,
  });
}

export async function updateProtectionOrderStatus(
  id: string,
  status: ProtectionOrderStatus,
) {
  return prisma.protectionOrder.update({
    where: { id },
    data: { status },
    include: orderInclude,
  });
}

export async function findExpiredOpenProtectionOrders(now = new Date()) {
  return prisma.protectionOrder.findMany({
    where: {
      status: { not: "CLOSED" },
      endsAt: { lte: now },
    },
    select: { id: true, publicId: true, status: true, endsAt: true },
  });
}

export async function closeProtectionOrdersByIds(ids: string[]) {
  if (ids.length === 0) {
    return { count: 0 };
  }

  return prisma.protectionOrder.updateMany({
    where: {
      id: { in: ids },
      status: { not: "CLOSED" },
    },
    data: { status: "CLOSED" },
  });
}

export async function reopenProtectionOrder(
  id: string,
  endsAt: Date,
  status: ProtectionOrderStatus = "ACTIVE",
) {
  return prisma.protectionOrder.update({
    where: { id },
    data: { status, endsAt },
    include: orderInclude,
  });
}

export async function findProtectionOrderById(id: string) {
  return prisma.protectionOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
}

export async function findProtectionOrderByJudicialRef(
  judicialRef: string,
  excludeId?: string,
) {
  return prisma.protectionOrder.findFirst({
    where: {
      judicialRef,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, publicId: true, judicialRef: true },
  });
}

export async function updateProtectionOrderGeofence(
  id: string,
  data: {
    geofenceState: GeofenceState;
    pendingCount: number;
    lastCheckAt: Date;
    lastDistanceM: number | null;
  },
) {
  return prisma.protectionOrder.update({
    where: { id },
    data: {
      geofenceState: data.geofenceState,
      pendingCount: data.pendingCount,
      lastCheckAt: data.lastCheckAt,
      lastDistanceM: data.lastDistanceM,
    },
    include: orderInclude,
  });
}

export async function listProtectionOrders(params: ProtectionOrderListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim();

  const where: Prisma.ProtectionOrderWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(q
      ? {
          OR: [
            { judicialRef: { contains: q, mode: "insensitive" } },
            { publicId: { contains: q, mode: "insensitive" } },
            { victim: { fullName: { contains: q, mode: "insensitive" } } },
            { inmate: { fullName: { contains: q, mode: "insensitive" } } },
            {
              inmate: {
                externalInmateId: { contains: q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.protectionOrder.count({ where }),
    prisma.protectionOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: orderInclude,
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

export async function deleteProtectionOrdersCascade(
  orderIds: string[],
  tx: Prisma.TransactionClient = prisma,
) {
  if (orderIds.length === 0) return;

  await tx.alert.deleteMany({
    where: { protectionOrderId: { in: orderIds } },
  });
  await tx.victimLocation.deleteMany({
    where: { protectionOrderId: { in: orderIds } },
  });
  await tx.device.deleteMany({
    where: { protectionOrderId: { in: orderIds } },
  });
  await tx.pairingToken.deleteMany({
    where: { protectionOrderId: { in: orderIds } },
  });
  await tx.protectionOrder.deleteMany({
    where: { id: { in: orderIds } },
  });
}

export async function deleteProtectionOrderById(id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.protectionOrder.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return false;

    await deleteProtectionOrdersCascade([id], tx);
    return true;
  });
}

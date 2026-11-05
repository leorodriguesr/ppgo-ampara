import type { Prisma, TrackingZone } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function findTrackingPoint(id: string) {
  return prisma.trackingPoint.findUnique({ where: { id } });
}

const pointWithOrder = {
  protectionOrder: {
    select: {
      id: true,
      judicialRef: true,
      radiusMeters: true,
      watchRadiusMeters: true,
      victim: { select: { fullName: true } },
      inmate: { select: { fullName: true } },
    },
  },
} as const;

type ZoneFilter = TrackingZone | { not: TrackingZone };

function zoneWhere(zone?: ZoneFilter) {
  if (!zone) return {};
  if (typeof zone === "object" && "not" in zone) {
    return { zone: { not: zone.not } };
  }
  return { zone };
}

export async function findTrackingPointBefore(
  protectionOrderId: string,
  before: Date,
  zone?: ZoneFilter,
) {
  return prisma.trackingPoint.findFirst({
    where: {
      protectionOrderId,
      recordedAt: { lt: before },
      ...zoneWhere(zone),
    },
    orderBy: { recordedAt: "desc" },
    include: pointWithOrder,
  });
}

export async function findTrackingPointAfter(
  protectionOrderId: string,
  after: Date,
  zone?: ZoneFilter,
) {
  return prisma.trackingPoint.findFirst({
    where: {
      protectionOrderId,
      recordedAt: { gt: after },
      ...zoneWhere(zone),
    },
    orderBy: { recordedAt: "asc" },
    include: pointWithOrder,
  });
}

export async function findFirstTrackingPoint(
  protectionOrderId: string,
  zone?: ZoneFilter,
) {
  return prisma.trackingPoint.findFirst({
    where: { protectionOrderId, ...zoneWhere(zone) },
    orderBy: { recordedAt: "asc" },
    include: pointWithOrder,
  });
}

const orderNameFilter = (q?: string): Prisma.TrackingPointWhereInput => {
  const term = q?.trim();
  if (!term) return {};
  return {
    protectionOrder: {
      OR: [
        { victim: { fullName: { contains: term, mode: "insensitive" } } },
        { inmate: { fullName: { contains: term, mode: "insensitive" } } },
        { judicialRef: { contains: term, mode: "insensitive" } },
      ],
    },
  };
};

/** Último ponto de cada medida antes de `before`. Serve para achar violação que atravessa as 08h. */
export async function listLatestPointsBefore(params: {
  before: Date;
  q?: string;
}) {
  const latest = await prisma.trackingPoint.groupBy({
    by: ["protectionOrderId"],
    where: {
      recordedAt: { lt: params.before },
      ...orderNameFilter(params.q),
    },
    _max: { recordedAt: true },
  });
  if (latest.length === 0) return [];

  return prisma.trackingPoint.findMany({
    where: {
      OR: latest.flatMap((row) =>
        row._max.recordedAt
          ? [
              {
                protectionOrderId: row.protectionOrderId,
                recordedAt: row._max.recordedAt,
              },
            ]
          : [],
      ),
    },
    include: pointWithOrder,
  });
}

export async function findLastTrackingPoint(protectionOrderId: string) {
  return prisma.trackingPoint.findFirst({
    where: { protectionOrderId },
    orderBy: { recordedAt: "desc" },
  });
}

export async function createTrackingPoint(
  data: {
    protectionOrderId: string;
    recordedAt: Date;
    zone: TrackingZone;
    distanceMeters: number;
    victimLatitude: number;
    victimLongitude: number;
    inmateLatitude: number;
    inmateLongitude: number;
    radiusMeters: number;
    watchRadiusMeters: number;
  },
) {
  return prisma.trackingPoint.create({ data });
}

export async function updateTrackingPointPlaces(
  id: string,
  places: { inmatePlace: string | null; victimPlace: string | null },
) {
  return prisma.trackingPoint.update({
    where: { id },
    data: places,
  });
}

export async function deleteTrackingPointsInRange(params: {
  protectionOrderId: string;
  from: Date;
  to: Date;
}) {
  return prisma.trackingPoint.deleteMany({
    where: {
      protectionOrderId: params.protectionOrderId,
      recordedAt: { gte: params.from, lte: params.to },
    },
  });
}

export async function listTrackingPointsInRange(params: {
  from: Date;
  to: Date;
  q?: string;
  protectionOrderId?: string;
  endExclusive?: boolean;
}) {
  const q = params.q?.trim();
  const where: Prisma.TrackingPointWhereInput = {
    recordedAt: params.endExclusive
      ? { gte: params.from, lt: params.to }
      : { gte: params.from, lte: params.to },
    ...(params.protectionOrderId
      ? { protectionOrderId: params.protectionOrderId }
      : {}),
    ...orderNameFilter(q),
  };

  return prisma.trackingPoint.findMany({
    where,
    orderBy: { recordedAt: "asc" },
    include: {
      protectionOrder: {
        select: {
          id: true,
          judicialRef: true,
          radiusMeters: true,
          watchRadiusMeters: true,
          victim: { select: { fullName: true } },
          inmate: { select: { fullName: true } },
        },
      },
    },
  });
}

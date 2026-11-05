import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import {
  assessDeviceSignal,
  expectedIntervalSeconds,
  zoneFromLookup,
  type DeviceSignal,
} from "@/services/proximity-policy";
import type {
  OperationsPoint,
  OperationsTrack,
  OperationsZone,
} from "@/types/operations";

export type { OperationsPoint, OperationsTrack, OperationsZone };

const STATE_RANK: Record<string, number> = {
  VIOLATING: 0,
  PENDING_VIOLATION: 1,
  PENDING_SAFE: 2,
  SAFE: 3,
};

const boardInclude = {
  victim: { select: { fullName: true, phone: true } },
  inmate: {
    select: {
      fullName: true,
      externalInmateId: true,
      simulatedLocation: {
        select: { latitude: true, longitude: true, updatedAt: true },
      },
    },
  },
  victimLocations: {
    orderBy: { recordedAt: "desc" as const },
    take: 1,
    select: {
      latitude: true,
      longitude: true,
      recordedAt: true,
    },
  },
  alerts: {
    where: { status: "OPEN" as const },
    orderBy: { openedAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      inmateLatitude: true,
      inmateLongitude: true,
      updatedAt: true,
    },
  },
  devices: {
    where: { status: "ACTIVE" as const },
    orderBy: { lastSeenAt: "desc" as const },
    take: 1,
    select: { lastSeenAt: true, backgroundEnabled: true },
  },
};

async function queryBoardOrders(orderId?: string) {
  return prisma.protectionOrder.findMany({
    where: {
      status: "ACTIVE",
      ...(orderId ? { id: orderId } : {}),
    },
    include: boardInclude,
  });
}

function buildTracks(
  orders: Awaited<ReturnType<typeof queryBoardOrders>>,
): OperationsTrack[] {
  const tracks = orders.flatMap((order) => {
    if (!order.victim || !order.inmate) return [];

    const lastVictim = order.victimLocations[0] ?? null;
    const simVictim =
      order.isSimulation &&
      order.simVictimLatitude != null &&
      order.simVictimLongitude != null
        ? {
            latitude: order.simVictimLatitude,
            longitude: order.simVictimLongitude,
            recordedAt: (order.simVictimAt ?? order.updatedAt).toISOString(),
          }
        : null;
    const victimLocation: OperationsPoint | null = simVictim
      ? simVictim
      : lastVictim
        ? {
            latitude: lastVictim.latitude,
            longitude: lastVictim.longitude,
            recordedAt: lastVictim.recordedAt.toISOString(),
          }
        : null;

    const mockInmate = order.isSimulation
      ? order.inmate.simulatedLocation
      : undefined;
    const openAlert = order.alerts[0];

    let inmateLocation: OperationsPoint | null = null;
    if (mockInmate) {
      inmateLocation = {
        latitude: mockInmate.latitude,
        longitude: mockInmate.longitude,
        recordedAt: mockInmate.updatedAt.toISOString(),
      };
    } else if (
      order.lastInmateLatitude != null &&
      order.lastInmateLongitude != null
    ) {
      inmateLocation = {
        latitude: order.lastInmateLatitude,
        longitude: order.lastInmateLongitude,
        recordedAt: (
          order.lastInmateAt ??
          order.lastCheckAt ??
          order.updatedAt
        ).toISOString(),
      };
    } else if (
      openAlert &&
      openAlert.inmateLatitude != null &&
      openAlert.inmateLongitude != null
    ) {
      inmateLocation = {
        latitude: openAlert.inmateLatitude,
        longitude: openAlert.inmateLongitude,
        recordedAt: openAlert.updatedAt.toISOString(),
      };
    }

    let distance = order.lastDistanceM;
    if (
      (distance == null || !Number.isFinite(distance)) &&
      victimLocation &&
      inmateLocation
    ) {
      distance = haversineDistanceMeters(
        victimLocation.latitude,
        victimLocation.longitude,
        inmateLocation.latitude,
        inmateLocation.longitude,
      );
    }

    const distanceMeters =
      distance != null && Number.isFinite(distance) ? distance : null;
    const zone = zoneFromLookup({
      lookupStatus: order.lookupStatus,
      geofenceState: order.geofenceState,
      distanceMeters:
        order.lookupStatus === "OUT_OF_WINDOW" &&
        order.geofenceState !== "VIOLATING" &&
        order.geofenceState !== "PENDING_SAFE"
          ? null
          : distanceMeters,
      radiusMeters: order.radiusMeters,
      watchRadiusMeters: order.watchRadiusMeters,
    });
    const shownDistance =
      zone === "clear" && order.lookupStatus === "OUT_OF_WINDOW"
        ? null
        : distanceMeters;
    const device = order.devices[0] ?? null;
    const lastContactAt = order.lastContactAt ?? device?.lastSeenAt ?? null;
    const signal: DeviceSignal = assessDeviceSignal({
      now: new Date(),
      lastContactAt,
      lastGpsAt: order.lastGpsAt,
      expectedSeconds: expectedIntervalSeconds(zone),
      backgroundEnabled: device?.backgroundEnabled ?? null,
    });

    if (zone === "clear") {
      inmateLocation = null;
    }

    return {
      orderId: order.id,
      publicId: order.publicId,
      judicialRef: order.judicialRef,
      radiusMeters: order.radiusMeters,
      watchRadiusMeters: order.watchRadiusMeters,
      geofenceState: order.geofenceState,
      zone,
      lastDistanceM: shownDistance,
      lastCheckAt: order.lastCheckAt?.toISOString() ?? null,
      lastContactAt: lastContactAt?.toISOString() ?? null,
      lastGpsAt: order.lastGpsAt?.toISOString() ?? null,
      lookupStatus: order.lookupStatus,
      signal,
      distanceFresh: order.lookupStatus === "OK",
      victim: {
        name: order.victim.fullName,
        phone: order.victim.phone,
        location: victimLocation,
      },
      inmate: {
        name: order.inmate.fullName,
        phone: null,
        location: inmateLocation,
      },
      alertId: openAlert?.id ?? null,
    } satisfies OperationsTrack;
  });

  tracks.sort((a, b) => {
    const rankA = STATE_RANK[a.geofenceState] ?? 9;
    const rankB = STATE_RANK[b.geofenceState] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    return (b.lastCheckAt ?? "").localeCompare(a.lastCheckAt ?? "");
  });

  return tracks;
}

export async function getOperationsBoard(options?: {
  includeClear?: boolean;
}): Promise<{
  tracks: OperationsTrack[];
  violatingCount: number;
  watchCount: number;
  clearCount: number;
  monitoredCount: number;
  silentCount: number;
  signals: OperationsTrack[];
}> {
  const tracks = buildTracks(await queryBoardOrders());
  const visible = options?.includeClear
    ? tracks
    : tracks.filter((track) => track.zone !== "clear");
  const signals = tracks.filter((track) => track.signal !== "ok");

  return {
    tracks: visible,
    violatingCount: tracks.filter((track) => track.zone === "violation").length,
    watchCount: tracks.filter((track) => track.zone === "watch").length,
    clearCount: tracks.filter((track) => track.zone === "clear").length,
    monitoredCount: tracks.length,
    silentCount: signals.length,
    signals,
  };
}

export async function getOperationsTrack(orderId: string) {
  const tracks = buildTracks(await queryBoardOrders(orderId));
  return tracks[0] ?? null;
}

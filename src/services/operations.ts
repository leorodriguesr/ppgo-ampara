import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { getMockInmateLocation } from "@/integrations/ankle-monitor/mock-store";
import type { OperationsPoint, OperationsTrack } from "@/types/operations";

export type { OperationsPoint, OperationsTrack };

const STATE_RANK: Record<string, number> = {
  VIOLATING: 0,
  PENDING_VIOLATION: 1,
  PENDING_SAFE: 2,
  SAFE: 3,
};

export async function getOperationsBoard(): Promise<{
  tracks: OperationsTrack[];
  violatingCount: number;
  monitoredCount: number;
}> {
  const orders = await prisma.protectionOrder.findMany({
    where: { status: "ACTIVE" },
    include: {
      victim: { select: { fullName: true } },
      inmate: { select: { fullName: true, externalInmateId: true } },
      victimLocations: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: {
          latitude: true,
          longitude: true,
          recordedAt: true,
        },
      },
      alerts: {
        where: { status: "OPEN" },
        orderBy: { openedAt: "desc" },
        take: 1,
        select: {
          id: true,
          inmateLatitude: true,
          inmateLongitude: true,
          updatedAt: true,
        },
      },
    },
  });

  const tracks = orders.map((order) => {
    const lastVictim = order.victimLocations[0] ?? null;
    const victimLocation: OperationsPoint | null = lastVictim
      ? {
          latitude: lastVictim.latitude,
          longitude: lastVictim.longitude,
          recordedAt: lastVictim.recordedAt.toISOString(),
        }
      : null;

    const mockInmate =
      order.isSimulation && order.inmate.externalInmateId
        ? getMockInmateLocation(order.inmate.externalInmateId)
        : undefined;
    const openAlert = order.alerts[0];

    let inmateLocation: OperationsPoint | null = null;
    if (mockInmate) {
      inmateLocation = {
        latitude: mockInmate.latitude,
        longitude: mockInmate.longitude,
        recordedAt: mockInmate.updatedAt,
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

    return {
      orderId: order.id,
      publicId: order.publicId,
      judicialRef: order.judicialRef,
      radiusMeters: order.radiusMeters,
      geofenceState: order.geofenceState,
      lastDistanceM:
        distance != null && Number.isFinite(distance) ? distance : null,
      lastCheckAt: order.lastCheckAt?.toISOString() ?? null,
      victim: {
        name: order.victim.fullName,
        location: victimLocation,
      },
      inmate: {
        name: order.inmate.fullName,
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

  return {
    tracks,
    violatingCount: tracks.filter((track) => track.geofenceState === "VIOLATING")
      .length,
    monitoredCount: tracks.length,
  };
}

import { geofenceConfig } from "@/config/geofence";
import type { GeofenceState } from "@/generated/prisma/client";
import {
  AnkleMonitorApiError,
  AnkleMonitorTimeoutError,
  localizarDetento,
} from "@/integrations/ankle-monitor";
import { AppError, NotFoundError } from "@/lib/errors";
import type { ActiveDeviceWithOrder } from "@/repositories/device.repository";
import {
  createAlert,
  findOpenAlertByOrderId,
  refreshAlert,
  resolveAlert,
} from "@/repositories/alert.repository";
import {
  findProtectionOrderById,
  updateProtectionOrderGeofence,
} from "@/repositories/protection-order.repository";
import { createVictimLocation } from "@/repositories/victim-location.repository";
import { evaluateGeofence } from "@/services/evaluate-geofence";
import { notifyVictimOfViolation } from "@/services/notify-victim";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

type ProximityCoords = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  recordedAt?: Date;
  appState?: "foreground" | "background";
};

export type ProximityCheckResponse = {
  geofenceState: GeofenceState;
  alert: {
    publicId: string;
    status: string;
    openedAt: string;
    distanceMeters: number;
  } | null;
  inmateLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
  distanceMeters: number | null;
  radiusMeters: number;
  judicialRef: string | null;
  startsAt: string | null;
  endsAt: string | null;
  nextCheckSuggestedSeconds: number;
  serverTime: string;
  degraded: boolean;
  /** Nome cadastrado do preso (Presos). */
  inmateName: string | null;
  /** Por que o check ficou degradado; ausente quando degradado=false. */
  degradedReason?: string;
};

const MAX_RECORDED_AT_SKEW_MS = 10 * 60 * 1000;
const ALERT_REFRESH_AUDIT_THROTTLE_MS = 60_000;

type OrderForProximity = NonNullable<
  Awaited<ReturnType<typeof findProtectionOrderById>>
>;

function nextCheckSuggestedSeconds(
  state: GeofenceState,
  appState?: "foreground" | "background",
  isSimulation?: boolean,
) {
  if (isSimulation === false) {
    if (
      state === "VIOLATING" ||
      state === "PENDING_VIOLATION" ||
      state === "PENDING_SAFE"
    ) {
      return geofenceConfig.intervals.liveViolatingSeconds;
    }
    return geofenceConfig.intervals.liveSeconds;
  }
  if (state === "VIOLATING") {
    return geofenceConfig.intervals.violatingMinSeconds;
  }
  // Confirma a 2ª leitura depressa (evita ~30s+30s só para abrir alerta).
  if (state === "PENDING_VIOLATION" || state === "PENDING_SAFE") {
    return geofenceConfig.intervals.violatingMinSeconds;
  }
  if (appState === "background") {
    return geofenceConfig.intervals.backgroundMinSeconds;
  }
  return geofenceConfig.intervals.foregroundSeconds;
}

function toAlertSummary(
  alert: {
    publicId: string;
    status: string;
    openedAt: Date;
    lastDistanceM: number;
  } | null,
) {
  if (!alert) return null;
  return {
    publicId: alert.publicId,
    status: alert.status,
    openedAt: alert.openedAt.toISOString(),
    distanceMeters: alert.lastDistanceM,
  };
}

function inmateFromAlert(
  alert: {
    inmateLatitude: number | null;
    inmateLongitude: number | null;
    externalTimestamp: Date | null;
    updatedAt: Date;
  } | null,
): ProximityCheckResponse["inmateLocation"] {
  if (
    !alert ||
    alert.inmateLatitude == null ||
    alert.inmateLongitude == null
  ) {
    return null;
  }

  return {
    latitude: alert.inmateLatitude,
    longitude: alert.inmateLongitude,
    timestamp: (alert.externalTimestamp ?? alert.updatedAt).toISOString(),
  };
}

function buildResponse(params: {
  geofenceState: GeofenceState;
  alert: Parameters<typeof toAlertSummary>[0];
  inmateLocation: ProximityCheckResponse["inmateLocation"];
  distanceMeters: number | null;
  radiusMeters: number;
  judicialRef: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  appState?: "foreground" | "background";
  isSimulation?: boolean;
  inmateName: string | null;
  degraded: boolean;
  degradedReason?: string;
}): ProximityCheckResponse {
  const insideRadius =
    params.distanceMeters != null &&
    params.distanceMeters <= params.radiusMeters;

  const response: ProximityCheckResponse = {
    geofenceState: params.geofenceState,
    alert: toAlertSummary(params.alert),
    inmateLocation: insideRadius ? params.inmateLocation : null,
    distanceMeters: params.distanceMeters,
    radiusMeters: params.radiusMeters,
    judicialRef: params.judicialRef,
    startsAt: params.startsAt?.toISOString() ?? null,
    endsAt: params.endsAt?.toISOString() ?? null,
    nextCheckSuggestedSeconds: nextCheckSuggestedSeconds(
      params.geofenceState,
      params.appState,
      params.isSimulation,
    ),
    serverTime: new Date().toISOString(),
    degraded: params.degraded,
    inmateName: params.inmateName,
  };

  if (params.degraded && params.degradedReason) {
    response.degradedReason = params.degradedReason;
  }

  return response;
}

function isExternalApiError(error: unknown) {
  return (
    error instanceof AnkleMonitorApiError ||
    error instanceof AnkleMonitorTimeoutError
  );
}

async function runProximityEngine(params: {
  order: OrderForProximity;
  coords: ProximityCoords;
  actor:
    | { type: "DEVICE"; deviceId: string }
    | { type: "USER"; userId: string };
  meta?: AuditMeta;
  source?: string;
}): Promise<ProximityCheckResponse> {
  const { order, coords, actor, meta } = params;

  if (order.status !== "ACTIVE") {
    throw new AppError(
      "ORDER_NOT_ACTIVE",
      "Somente medidas ativas podem verificar proximidade",
      400,
    );
  }

  const recordedAt = coords.recordedAt ?? new Date();
  const now = Date.now();
  const recordedAtSkewed =
    Math.abs(recordedAt.getTime() - now) > MAX_RECORDED_AT_SKEW_MS;

  console.log("[proximity/check]", {
    orderId: order.id,
    isSimulation: order.isSimulation,
    externalInmateId: order.inmate?.externalInmateId ?? null,
    accuracyMeters: coords.accuracyMeters ?? null,
    recordedAtSkewed,
  });

  await createVictimLocation({
    protectionOrderId: order.id,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyMeters: coords.accuracyMeters,
    recordedAt: recordedAtSkewed ? new Date() : recordedAt,
    source: params.source ?? (actor.type === "DEVICE" ? "APP" : "POLICE_TEST"),
  });

  if (!order.inmate?.externalInmateId) {
    console.log("[proximity/check] degradado: preso sem ID de tornozeleira");
    const openAlert = await findOpenAlertByOrderId(order.id);
    return buildResponse({
      geofenceState: order.geofenceState,
      alert: openAlert,
      inmateLocation: inmateFromAlert(openAlert),
      distanceMeters: null,
      radiusMeters: order.radiusMeters,
      judicialRef: order.judicialRef ?? null,
      startsAt: order.startsAt ?? null,
      endsAt: order.endsAt ?? null,
      appState: coords.appState,
      isSimulation: order.isSimulation,
      inmateName: order.inmate?.fullName?.trim() || null,
      degraded: true,
      degradedReason: "missing_external_inmate_id",
    });
  }

  let localizar: Awaited<ReturnType<typeof localizarDetento>>;
  try {
    localizar = await localizarDetento({
      idDetento: order.inmate.externalInmateId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      isSimulation: order.isSimulation,
    });
  } catch (error) {
    if (isExternalApiError(error)) {
      await writeAuditLog({
        actorUserId: actor.type === "USER" ? actor.userId : null,
        actorType: actor.type === "DEVICE" ? "DEVICE" : "USER",
        action: "EXTERNAL_API_ERROR",
        entityType: "ProtectionOrder",
        entityId: order.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
          operation: "proximity_check",
          deviceId: actor.type === "DEVICE" ? actor.deviceId : undefined,
          message: error instanceof Error ? error.message : String(error),
        },
      });

      console.log("[proximity/check] degradado: falha ao localizar preso", {
        message: error instanceof Error ? error.message : String(error),
        isSimulation: order.isSimulation,
      });

      const openAlert = await findOpenAlertByOrderId(order.id);
      return buildResponse({
        geofenceState: order.geofenceState,
        alert: openAlert,
        inmateLocation: inmateFromAlert(openAlert),
        distanceMeters: null,
        radiusMeters: order.radiusMeters,
        judicialRef: order.judicialRef ?? null,
        startsAt: order.startsAt ?? null,
        endsAt: order.endsAt ?? null,
        appState: coords.appState,
        isSimulation: order.isSimulation,
        inmateName: order.inmate?.fullName?.trim() || null,
        degraded: true,
        degradedReason: "external_location_unavailable",
      });
    }
    throw error;
  }

  const distanceMeters = localizar.distanciaMetros;
  console.log("[proximity/check] localizar ok", {
    isSimulation: order.isSimulation,
    distanceMeters,
    latitudePreso: localizar.latitudePreso,
    longitudePreso: localizar.longitudePreso,
  });
  const evaluation = evaluateGeofence({
    radiusMeters: order.radiusMeters,
    distanceMeters,
    hysteresisMeters: geofenceConfig.hysteresisMeters,
    currentState: order.geofenceState,
    pendingCount: order.pendingCount,
    requiredConsecutiveHits: geofenceConfig.requiredConsecutiveHits,
  });

  await updateProtectionOrderGeofence(order.id, {
    geofenceState: evaluation.nextState,
    pendingCount: evaluation.pendingCount,
    lastCheckAt: new Date(),
    lastDistanceM: distanceMeters,
  });

  const inmateLocation = {
    latitude: localizar.latitudePreso,
    longitude: localizar.longitudePreso,
    timestamp: localizar.timestamp,
  };

  const externalTimestamp = (() => {
    const parsed = new Date(localizar.timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  let openAlert = await findOpenAlertByOrderId(order.id);

  const shouldNotifyVictim =
    evaluation.nextState === "VIOLATING" &&
    (evaluation.shouldOpenAlert ||
      order.geofenceState !== "VIOLATING" ||
      actor.type === "USER");

  if (evaluation.shouldOpenAlert) {
    openAlert = await createAlert({
      protectionOrderId: order.id,
      triggerDistanceM: distanceMeters,
      lastDistanceM: distanceMeters,
      inmateLatitude: localizar.latitudePreso,
      inmateLongitude: localizar.longitudePreso,
      victimLatitude: coords.latitude,
      victimLongitude: coords.longitude,
      externalTimestamp,
      consecutiveHits: geofenceConfig.requiredConsecutiveHits,
    });

    await writeAuditLog({
      actorUserId: actor.type === "USER" ? actor.userId : null,
      actorType: actor.type === "DEVICE" ? "DEVICE" : "USER",
      action: "ALERT_OPENED",
      entityType: "Alert",
      entityId: openAlert.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        protectionOrderId: order.id,
        distanceMeters,
        geofenceState: evaluation.nextState,
        deviceId: actor.type === "DEVICE" ? actor.deviceId : undefined,
      },
    });
  } else if (
    openAlert &&
    evaluation.nextState === "VIOLATING" &&
    !evaluation.shouldResolveAlert
  ) {
    const previousUpdatedAt = openAlert.updatedAt;
    openAlert = await refreshAlert(openAlert.id, {
      lastDistanceM: distanceMeters,
      inmateLatitude: localizar.latitudePreso,
      inmateLongitude: localizar.longitudePreso,
      victimLatitude: coords.latitude,
      victimLongitude: coords.longitude,
      externalTimestamp,
    });

    const shouldAuditRefresh =
      now - previousUpdatedAt.getTime() >= ALERT_REFRESH_AUDIT_THROTTLE_MS;

    if (shouldAuditRefresh) {
      await writeAuditLog({
        actorUserId: actor.type === "USER" ? actor.userId : null,
        actorType: actor.type === "DEVICE" ? "DEVICE" : "USER",
        action: "ALERT_REFRESHED",
        entityType: "Alert",
        entityId: openAlert.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
          protectionOrderId: order.id,
          distanceMeters,
          deviceId: actor.type === "DEVICE" ? actor.deviceId : undefined,
        },
      });
    }
  }

  if (evaluation.shouldResolveAlert && openAlert) {
    openAlert = await resolveAlert(openAlert.id, "RESOLVED");

    await writeAuditLog({
      actorUserId: actor.type === "USER" ? actor.userId : null,
      actorType: actor.type === "DEVICE" ? "DEVICE" : "USER",
      action: "ALERT_RESOLVED",
      entityType: "Alert",
      entityId: openAlert.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        protectionOrderId: order.id,
        distanceMeters,
        reason: "geofence_exit",
        deviceId: actor.type === "DEVICE" ? actor.deviceId : undefined,
      },
    });

    openAlert = null;
  }

  if (shouldNotifyVictim) {
    try {
      await notifyVictimOfViolation({
        protectionOrderId: order.id,
        distanceMeters,
      });
    } catch (error) {
      console.error("[push] falha ao notificar vítima", error);
    }
  }

  await writeAuditLog({
    actorUserId: actor.type === "USER" ? actor.userId : null,
    actorType: actor.type === "DEVICE" ? "DEVICE" : "USER",
    action: "PROXIMITY_CHECKED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      distanceMeters,
      geofenceState: evaluation.nextState,
      previousState: order.geofenceState,
      pendingCount: evaluation.pendingCount,
      deviceId: actor.type === "DEVICE" ? actor.deviceId : undefined,
    },
  });

  return buildResponse({
    geofenceState: evaluation.nextState,
    alert: openAlert?.status === "OPEN" ? openAlert : null,
    inmateLocation,
    distanceMeters,
    radiusMeters: order.radiusMeters,
    judicialRef: order.judicialRef ?? null,
    startsAt: order.startsAt ?? null,
    endsAt: order.endsAt ?? null,
    appState: coords.appState,
    isSimulation: order.isSimulation,
    inmateName: order.inmate?.fullName?.trim() || null,
    degraded: false,
  });
}

export async function checkProximityService(params: {
  device: ActiveDeviceWithOrder;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  recordedAt?: Date;
  appState?: "foreground" | "background";
  meta?: AuditMeta;
}): Promise<ProximityCheckResponse> {
  const order = await findProtectionOrderById(params.device.protectionOrderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  return runProximityEngine({
    order,
    coords: {
      latitude: params.latitude,
      longitude: params.longitude,
      accuracyMeters: params.accuracyMeters,
      recordedAt: params.recordedAt,
      appState: params.appState,
    },
    actor: { type: "DEVICE", deviceId: params.device.id },
    meta: params.meta,
    source: "APP",
  });
}

/**
 * Mesmo motor de proximidade, autenticado como polícia (teste no painel).
 */
export async function checkProximityForOrderAsPolice(
  orderId: string,
  coords: ProximityCoords,
  actorUserId: string,
  meta?: AuditMeta,
): Promise<ProximityCheckResponse> {
  const order = await findProtectionOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  return runProximityEngine({
    order,
    coords,
    actor: { type: "USER", userId: actorUserId },
    meta,
    source: "POLICE_TEST",
  });
}

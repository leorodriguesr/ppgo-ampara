import { geofenceConfig } from "@/config/geofence";
import type { GeofenceState } from "@/generated/prisma/client";
import {
  AnkleMonitorApiError,
  AnkleMonitorTimeoutError,
  InmateOutOfWindowError,
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
  rememberSimulatedVictimFix,
  updateProtectionOrderGeofence,
} from "@/repositories/protection-order.repository";
import { createVictimLocation } from "@/repositories/victim-location.repository";
import { notifyVictimOfViolation } from "@/services/notify-victim";
import { ensureProtectionOrderNotExpired } from "@/services/protection-order-expiry";
import {
  decideFoundGeofence,
  intervalAfterAbsence,
  intervalAfterFailure,
  isVictimFixStale,
  stateAfterAbsence,
} from "@/services/proximity-policy";
import { recordTrackingPoint } from "@/services/tracking";
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
  lookupStatus: "UNKNOWN" | "OK" | "OUT_OF_WINDOW" | "FAILED";
};

const ALERT_REFRESH_AUDIT_THROTTLE_MS = 60_000;

type OrderForProximity = NonNullable<
  Awaited<ReturnType<typeof findProtectionOrderById>>
>;

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
  inmateName: string | null;
  degraded: boolean;
  degradedReason?: string;
  nextCheckSuggestedSeconds: number;
  lookupStatus: ProximityCheckResponse["lookupStatus"];
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
    nextCheckSuggestedSeconds: params.nextCheckSuggestedSeconds,
    serverTime: new Date().toISOString(),
    degraded: params.degraded,
    inmateName: params.inmateName,
    lookupStatus: params.lookupStatus,
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
  const checkedAt = new Date();
  const fixIsStale = isVictimFixStale({
    accuracyMeters: coords.accuracyMeters,
    recordedAt: coords.recordedAt,
    now: checkedAt,
  });

  if (fixIsStale) {
    await updateProtectionOrderGeofence(order.id, {
      geofenceState: order.geofenceState,
      pendingCount: order.pendingCount,
      lastCheckAt: checkedAt,
      lastDistanceM: order.lastDistanceM,
      lookupStatus: "FAILED",
      lastContactAt: checkedAt,
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
      inmateName: order.inmate?.fullName?.trim() || null,
      degraded: true,
      degradedReason: "stale_victim_fix",
      nextCheckSuggestedSeconds: intervalAfterFailure(),
      lookupStatus: "FAILED",
    });
  }

  if (order.isSimulation && params.source === "APP") {
    await rememberSimulatedVictimFix(order.id, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      recordedAt,
    });
  }

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
      inmateName: order.inmate?.fullName?.trim() || null,
      degraded: true,
      degradedReason: "missing_external_inmate_id",
      nextCheckSuggestedSeconds: intervalAfterFailure(),
      lookupStatus: "FAILED",
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
    if (error instanceof InmateOutOfWindowError) {
      const nextState = stateAfterAbsence(order.geofenceState);
      const keepViolation =
        nextState === "VIOLATING" || nextState === "PENDING_SAFE";
      await updateProtectionOrderGeofence(order.id, {
        geofenceState: nextState,
        pendingCount: keepViolation ? order.pendingCount : 0,
        lastCheckAt: checkedAt,
        lastDistanceM: keepViolation ? order.lastDistanceM : null,
        lookupStatus: "OUT_OF_WINDOW",
        lastContactAt: checkedAt,
        lastGpsAt: recordedAt,
      });
      const openAlert = await findOpenAlertByOrderId(order.id);
      return buildResponse({
        geofenceState: nextState,
        alert: keepViolation && openAlert?.status === "OPEN" ? openAlert : null,
        inmateLocation: keepViolation ? inmateFromAlert(openAlert) : null,
        distanceMeters: null,
        radiusMeters: order.radiusMeters,
        judicialRef: order.judicialRef ?? null,
        startsAt: order.startsAt ?? null,
        endsAt: order.endsAt ?? null,
        inmateName: order.inmate?.fullName?.trim() || null,
        degraded: false,
        nextCheckSuggestedSeconds: intervalAfterAbsence(order.geofenceState),
        lookupStatus: "OUT_OF_WINDOW",
      });
    }

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

      await updateProtectionOrderGeofence(order.id, {
        geofenceState: order.geofenceState,
        pendingCount: order.pendingCount,
        lastCheckAt: checkedAt,
        lastDistanceM: order.lastDistanceM,
        lookupStatus: "FAILED",
        lastContactAt: checkedAt,
        lastGpsAt: recordedAt,
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
        inmateName: order.inmate?.fullName?.trim() || null,
        degraded: true,
        degradedReason: "external_location_unavailable",
        nextCheckSuggestedSeconds: intervalAfterFailure(),
        lookupStatus: "FAILED",
      });
    }
    throw error;
  }

  const distanceMeters = localizar.distanciaMetros;
  const evaluation = decideFoundGeofence({
    radiusMeters: order.radiusMeters,
    watchRadiusMeters: order.watchRadiusMeters,
    distanceMeters,
    currentState: order.geofenceState,
    pendingCount: order.pendingCount,
  });

  await updateProtectionOrderGeofence(order.id, {
    geofenceState: evaluation.nextState,
    pendingCount: evaluation.pendingCount,
    lastCheckAt: checkedAt,
    lastDistanceM: distanceMeters,
    lastInmateLatitude: localizar.latitudePreso,
    lastInmateLongitude: localizar.longitudePreso,
    lastInmateAt: checkedAt,
    lookupStatus: "OK",
    lastContactAt: checkedAt,
    lastGpsAt: recordedAt,
  });

  if (evaluation.persistFix) {
    await createVictimLocation({
      protectionOrderId: order.id,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters,
      recordedAt,
      source: params.source ?? (actor.type === "DEVICE" ? "APP" : "POLICE_TEST"),
    });
  }

  try {
    await recordTrackingPoint({
      protectionOrderId: order.id,
      recordedAt: checkedAt,
      distanceMeters,
      radiusMeters: order.radiusMeters,
      watchRadiusMeters: order.watchRadiusMeters,
      geofenceViolating: evaluation.nextState === "VIOLATING",
      previousDistanceMeters: order.lastDistanceM,
      victimLatitude: coords.latitude,
      victimLongitude: coords.longitude,
      inmateLatitude: localizar.latitudePreso,
      inmateLongitude: localizar.longitudePreso,
    });
  } catch (error) {
    console.error("[tracking] falha ao gravar percurso", error);
  }

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

  await ensureProtectionOrderNotExpired({
    id: order.id,
    publicId: order.publicId,
    status: order.status,
    endsAt: order.endsAt,
    geofenceState: evaluation.nextState,
  });

  if (evaluation.auditProximity) {
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
  }

  return buildResponse({
    geofenceState: evaluation.nextState,
    alert: openAlert?.status === "OPEN" ? openAlert : null,
    inmateLocation,
    distanceMeters,
    radiusMeters: order.radiusMeters,
    judicialRef: order.judicialRef ?? null,
    startsAt: order.startsAt ?? null,
    endsAt: order.endsAt ?? null,
    inmateName: order.inmate?.fullName?.trim() || null,
    degraded: false,
    nextCheckSuggestedSeconds: evaluation.nextCheckSeconds,
    lookupStatus: "OK",
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

import { AppError, NotFoundError } from "@/lib/errors";
import type { ActiveDeviceWithOrder } from "@/repositories/device.repository";
import {
  findAlertById,
  findOpenAlertByOrderId,
  listAlerts,
  resolveAlert,
  type AlertListParams,
} from "@/repositories/alert.repository";
import { updateProtectionOrderGeofence } from "@/repositories/protection-order.repository";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export async function listAlertsService(params: AlertListParams) {
  return listAlerts(params);
}

export async function getAlertService(id: string) {
  const alert = await findAlertById(id);
  if (!alert) {
    throw new NotFoundError("Alerta não encontrado");
  }
  return alert;
}

export async function resolveAlertService(
  id: string,
  actorUserId: string,
  input?: { reason?: string; status?: "RESOLVED" | "FALSE_POSITIVE" },
  meta?: AuditMeta,
) {
  const alert = await findAlertById(id);
  if (!alert) {
    throw new NotFoundError("Alerta não encontrado");
  }

  if (alert.status !== "OPEN") {
    throw new AppError(
      "ALERT_NOT_OPEN",
      "Somente alertas abertos podem ser resolvidos",
      400,
    );
  }

  const status = input?.status ?? "RESOLVED";
  const resolved = await resolveAlert(alert.id, status);

  // Ao resolver manualmente, volta geofence para SAFE se ainda estiver violando
  if (alert.protectionOrder.geofenceState === "VIOLATING") {
    await updateProtectionOrderGeofence(alert.protectionOrderId, {
      geofenceState: "SAFE",
      pendingCount: 0,
      lastCheckAt: new Date(),
      lastDistanceM: alert.lastDistanceM,
    });
  }

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "ALERT_RESOLVED",
    entityType: "Alert",
    entityId: resolved.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      reason: input?.reason ?? null,
      status,
      protectionOrderId: alert.protectionOrderId,
      manual: true,
    },
  });

  return resolved;
}

/**
 * Alerta OPEN da medida do dispositivo + coords do preso (somente se aberto).
 */
export async function getActiveAlertForDevice(device: ActiveDeviceWithOrder) {
  const alert = await findOpenAlertByOrderId(device.protectionOrderId);

  if (!alert) {
    return {
      alert: null,
      inmateLocation: null,
      geofenceState: device.protectionOrder.geofenceState,
      serverTime: new Date().toISOString(),
    };
  }

  return {
    alert: {
      publicId: alert.publicId,
      status: alert.status,
      openedAt: alert.openedAt.toISOString(),
      distanceMeters: alert.lastDistanceM,
      victimLatitude: alert.victimLatitude,
      victimLongitude: alert.victimLongitude,
    },
    inmateLocation: {
      latitude: alert.inmateLatitude,
      longitude: alert.inmateLongitude,
      timestamp: (alert.externalTimestamp ?? alert.openedAt).toISOString(),
    },
    geofenceState: device.protectionOrder.geofenceState,
    serverTime: new Date().toISOString(),
  };
}

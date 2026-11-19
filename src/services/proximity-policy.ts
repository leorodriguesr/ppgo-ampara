import { geofenceConfig } from "@/config/geofence";
import { evaluateGeofence } from "@/services/evaluate-geofence";
import type { GeofenceEvaluationInput } from "@/types/geofence";

export type GeofenceState = GeofenceEvaluationInput["currentState"];

export type DeviceSignal = "ok" | "no_signal" | "stale_gps" | "no_background";

export type OperationsZone = "violation" | "watch" | "clear";

/** Metas de consulta. O sistema operacional pode atrasar a tarefa. */
export const monitoringIntervals = {
  farSeconds: 45,
  watchSeconds: 15,
  violationSeconds: 5,
  failedSeconds: 45,
} as const;

const STALE_FIX_MS = 2 * 60 * 1000;
const POOR_ACCURACY_METERS = 500;
const STALE_GPS_MS = 3 * 60 * 1000;
const SILENT_FLOOR_MS = 90_000;

export function isVictimFixStale(input: {
  accuracyMeters?: number | null;
  recordedAt?: Date | null;
  now: Date;
}) {
  if (
    input.accuracyMeters != null &&
    input.accuracyMeters > POOR_ACCURACY_METERS
  ) {
    return true;
  }
  if (!input.recordedAt) return false;
  return Math.abs(input.now.getTime() - input.recordedAt.getTime()) > STALE_FIX_MS;
}

/** Fora da lista válida não encerra violação já aberta. */
export function stateAfterAbsence(current: GeofenceState): GeofenceState {
  if (current === "VIOLATING" || current === "PENDING_SAFE") return current;
  return "SAFE";
}

export function intervalAfterAbsence(current: GeofenceState) {
  if (current === "VIOLATING" || current === "PENDING_SAFE") {
    return monitoringIntervals.violationSeconds;
  }
  return monitoringIntervals.farSeconds;
}

export function intervalAfterFailure() {
  return monitoringIntervals.failedSeconds;
}

export function intervalAfterFix(
  state: GeofenceState,
  distanceMeters: number,
  watchRadiusMeters: number,
) {
  if (
    state === "VIOLATING" ||
    state === "PENDING_VIOLATION" ||
    state === "PENDING_SAFE"
  ) {
    return monitoringIntervals.violationSeconds;
  }
  if (distanceMeters <= watchRadiusMeters) return monitoringIntervals.watchSeconds;
  return monitoringIntervals.farSeconds;
}

export function shouldPersistVictimFix(
  distanceMeters: number,
  watchRadiusMeters: number,
  violating: boolean,
) {
  return violating || distanceMeters <= watchRadiusMeters;
}

export function shouldAuditProximityCheck(
  previous: GeofenceState,
  next: GeofenceState,
) {
  return previous !== next;
}

export function decideFoundGeofence(input: {
  radiusMeters: number;
  watchRadiusMeters: number;
  distanceMeters: number;
  currentState: GeofenceState;
  pendingCount: number;
}) {
  const evaluation = evaluateGeofence({
    radiusMeters: input.radiusMeters,
    distanceMeters: input.distanceMeters,
    hysteresisMeters: geofenceConfig.hysteresisMeters,
    currentState: input.currentState,
    pendingCount: input.pendingCount,
    requiredConsecutiveHits: geofenceConfig.requiredConsecutiveHits,
  });

  return {
    ...evaluation,
    persistFix: shouldPersistVictimFix(
      input.distanceMeters,
      input.watchRadiusMeters,
      evaluation.nextState === "VIOLATING",
    ),
    nextCheckSeconds: intervalAfterFix(
      evaluation.nextState,
      input.distanceMeters,
      input.watchRadiusMeters,
    ),
    auditProximity: shouldAuditProximityCheck(
      input.currentState,
      evaluation.nextState,
    ),
  };
}

export function expectedIntervalSeconds(zone: OperationsZone) {
  if (zone === "violation") return monitoringIntervals.violationSeconds;
  if (zone === "watch") return monitoringIntervals.watchSeconds;
  return monitoringIntervals.farSeconds;
}

export function assessDeviceSignal(input: {
  now: Date;
  lastContactAt: Date | null;
  lastGpsAt: Date | null;
  expectedSeconds: number;
  backgroundEnabled: boolean | null;
}): DeviceSignal {
  const limit = Math.max(input.expectedSeconds * 2 * 1000, SILENT_FLOOR_MS);
  const contactAge = input.lastContactAt
    ? input.now.getTime() - input.lastContactAt.getTime()
    : Number.POSITIVE_INFINITY;

  if (contactAge > limit) return "no_signal";
  if (input.backgroundEnabled === false) return "no_background";

  const gpsAge = input.lastGpsAt
    ? input.now.getTime() - input.lastGpsAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (gpsAge > STALE_GPS_MS) return "stale_gps";
  return "ok";
}

export type DeviceLink =
  | "paired"
  | "unpaired"
  | "no_signal"
  | "no_position"
  | "no_background";

export type AlertBlock = "unpaired" | "no_signal" | "no_position";

/** Situação do aparelho numa medida já ativa. */
export function deviceLinkForActiveOrder(input: {
  hasActiveDevice: boolean;
  now: Date;
  lastContactAt: Date | null;
  lastGpsAt: Date | null;
  expectedSeconds: number;
  backgroundEnabled: boolean | null;
}): DeviceLink {
  if (!input.hasActiveDevice) return "unpaired";
  const signal = assessDeviceSignal(input);
  if (signal === "no_signal") return "no_signal";
  if (signal === "stale_gps") return "no_position";
  if (signal === "no_background") return "no_background";
  return "paired";
}

/**
 * Alerta novo só com aparelho pareado, contato recente e GPS recente.
 * Permissão de segundo plano não entra: a posição atual é o que vale.
 */
export function alertBlockReason(input: {
  hasActiveDevice: boolean;
  now: Date;
  lastContactAt: Date | null;
  lastGpsAt: Date | null;
  expectedSeconds: number;
}): AlertBlock | null {
  if (!input.hasActiveDevice) return "unpaired";
  const signal = assessDeviceSignal({
    ...input,
    backgroundEnabled: null,
  });
  if (signal === "no_signal") return "no_signal";
  if (signal === "stale_gps") return "no_position";
  return null;
}

export function alertBlockMessage(block: AlertBlock) {
  if (block === "unpaired") {
    return "Não há aparelho pareado. O alerta não é gerado.";
  }
  if (block === "no_signal") {
    return "O aparelho está sem sinal. A última posição não gera alerta.";
  }
  return "O aparelho está sem posição atual. A última coordenada não gera alerta.";
}

export function zoneFromLookup(input: {
  lookupStatus: "UNKNOWN" | "OK" | "OUT_OF_WINDOW" | "FAILED";
  geofenceState: GeofenceState;
  distanceMeters: number | null;
  radiusMeters: number;
  watchRadiusMeters: number;
}): OperationsZone {
  if (
    input.lookupStatus === "OUT_OF_WINDOW" &&
    input.geofenceState !== "VIOLATING" &&
    input.geofenceState !== "PENDING_SAFE"
  ) {
    return "clear";
  }
  if (
    input.geofenceState === "VIOLATING" ||
    (input.distanceMeters != null && input.distanceMeters <= input.radiusMeters)
  ) {
    return "violation";
  }
  if (
    input.distanceMeters != null &&
    input.distanceMeters <= input.watchRadiusMeters
  ) {
    return "watch";
  }
  return "clear";
}

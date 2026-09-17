import type {
  GeofenceEvaluationInput,
  GeofenceEvaluationResult,
} from "@/types/geofence";

/**
 * Motor de geofence com histerese e hits consecutivos.
 *
 * - enterThreshold = raio da medida (ex.: 300) — no limite já conta como dentro
 * - exitThreshold  = raio + histerese (ex.: 320) — evita oscilar ao sair
 * - Abre alerta só após `requiredConsecutiveHits` leituras ≤ enter
 * - Resolve só após `requiredConsecutiveHits` leituras ≥ exit
 */
export function evaluateGeofence(
  input: GeofenceEvaluationInput,
): GeofenceEvaluationResult {
  const enterThreshold = input.radiusMeters;
  const exitThreshold = input.radiusMeters + input.hysteresisMeters;
  const { distanceMeters, currentState, pendingCount, requiredConsecutiveHits } =
    input;

  const insideEnter = distanceMeters <= enterThreshold;
  const outsideExit = distanceMeters >= exitThreshold;

  if (currentState === "VIOLATING" || currentState === "PENDING_SAFE") {
    if (outsideExit) {
      const nextPending =
        currentState === "PENDING_SAFE" ? pendingCount + 1 : 1;

      if (nextPending >= requiredConsecutiveHits) {
        return {
          nextState: "SAFE",
          pendingCount: 0,
          enterThreshold,
          exitThreshold,
          shouldOpenAlert: false,
          shouldResolveAlert: true,
        };
      }

      return {
        nextState: "PENDING_SAFE",
        pendingCount: nextPending,
        enterThreshold,
        exitThreshold,
        shouldOpenAlert: false,
        shouldResolveAlert: false,
      };
    }

    return {
      nextState: "VIOLATING",
      pendingCount: Math.max(pendingCount, requiredConsecutiveHits),
      enterThreshold,
      exitThreshold,
      shouldOpenAlert: false,
      shouldResolveAlert: false,
    };
  }

  // SAFE | PENDING_VIOLATION
  if (!insideEnter) {
    return {
      nextState: "SAFE",
      pendingCount: 0,
      enterThreshold,
      exitThreshold,
      shouldOpenAlert: false,
      shouldResolveAlert: false,
    };
  }

  const nextPending =
    currentState === "PENDING_VIOLATION" ? pendingCount + 1 : 1;

  if (nextPending >= requiredConsecutiveHits) {
    return {
      nextState: "VIOLATING",
      pendingCount: requiredConsecutiveHits,
      enterThreshold,
      exitThreshold,
      shouldOpenAlert: true,
      shouldResolveAlert: false,
    };
  }

  return {
    nextState: "PENDING_VIOLATION",
    pendingCount: nextPending,
    enterThreshold,
    exitThreshold,
    shouldOpenAlert: false,
    shouldResolveAlert: false,
  };
}

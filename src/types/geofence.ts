export type GeofenceEvaluationInput = {
  radiusMeters: number;
  distanceMeters: number;
  hysteresisMeters: number;
  currentState: "SAFE" | "PENDING_VIOLATION" | "VIOLATING" | "PENDING_SAFE";
  pendingCount: number;
  requiredConsecutiveHits: number;
};

export type GeofenceEvaluationResult = {
  nextState: GeofenceEvaluationInput["currentState"];
  pendingCount: number;
  enterThreshold: number;
  exitThreshold: number;
  shouldOpenAlert: boolean;
  shouldResolveAlert: boolean;
};

/** O ritmo de consulta fica em monitoringIntervals. O app segue nextCheckSuggestedSeconds. */
export const geofenceConfig = {
  hysteresisMeters: 20,
  requiredConsecutiveHits: 1,
} as const;

export function getEnterThreshold(radiusMeters: number): number {
  return radiusMeters;
}

export function getExitThreshold(radiusMeters: number): number {
  return radiusMeters + geofenceConfig.hysteresisMeters;
}

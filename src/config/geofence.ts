/** Intervalos do loop de proximidade (app respeita nextCheckSuggestedSeconds). */
export const geofenceConfig = {
  hysteresisMeters: 20,
  requiredConsecutiveHits: 2,
  intervals: {
    foregroundSeconds: 8,
    backgroundMinSeconds: 120,
    backgroundMaxSeconds: 300,
    liveSeconds: 10,
    liveViolatingSeconds: 5,
    violatingMinSeconds: 3,
    violatingMaxSeconds: 10,
  },
} as const;

export function getEnterThreshold(radiusMeters: number): number {
  return radiusMeters;
}

export function getExitThreshold(radiusMeters: number): number {
  return radiusMeters + geofenceConfig.hysteresisMeters;
}

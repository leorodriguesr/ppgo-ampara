/** Intervalos do loop de proximidade (app respeita nextCheckSuggestedSeconds). */
export const geofenceConfig = {
  hysteresisMeters: 20,
  requiredConsecutiveHits: 1,
  intervals: {
    foregroundSeconds: 10,
    backgroundMinSeconds: 30,
    backgroundMaxSeconds: 30,
    liveSeconds: 10,
    liveViolationSeconds: 5,
    liveViolatingSeconds: 5,
    violatingMinSeconds: 5,
    violatingMaxSeconds: 10,
  },
} as const;

export function getEnterThreshold(radiusMeters: number): number {
  return radiusMeters;
}

export function getExitThreshold(radiusMeters: number): number {
  return radiusMeters + geofenceConfig.hysteresisMeters;
}

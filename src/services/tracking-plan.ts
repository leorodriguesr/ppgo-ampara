import type { TrackingZone } from "@/generated/prisma/client";

import { trackingConfig } from "@/config/tracking";

export function shouldStoreTrackingPoint(input: {
  zone: TrackingZone;
  lastZone: TrackingZone | null;
  lastRecordedAt: Date | null;
  recordedAt: Date;
  previousDistanceMeters: number | null;
  watchRadiusMeters: number;
  inmateMoved: boolean;
  victimMoved: boolean;
}) {
  if (input.zone === "OUTSIDE") {
    if (input.lastZone == null || input.lastZone === "OUTSIDE" || !input.lastRecordedAt) {
      return false;
    }
    return (
      input.recordedAt.getTime() - input.lastRecordedAt.getTime() <=
      trackingConfig.exitMaxGapMs
    );
  }

  const wasOutside =
    input.lastZone == null ||
    input.lastZone === "OUTSIDE" ||
    input.previousDistanceMeters == null ||
    input.previousDistanceMeters > input.watchRadiusMeters;
  const zoneChanged = Boolean(input.lastZone && input.lastZone !== input.zone);
  return wasOutside || input.inmateMoved || input.victimMoved || zoneChanged;
}

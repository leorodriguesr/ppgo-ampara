export type OperationsPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type OperationsZone = "violation" | "watch" | "clear";

export type DeviceSignal = "ok" | "no_signal" | "stale_gps" | "no_background";

export type OperationsTrack = {
  orderId: string;
  publicId: string;
  judicialRef: string | null;
  radiusMeters: number;
  watchRadiusMeters: number;
  geofenceState: string;
  zone: OperationsZone;
  lastDistanceM: number | null;
  lastCheckAt: string | null;
  lastContactAt: string | null;
  lastGpsAt: string | null;
  lookupStatus: "UNKNOWN" | "OK" | "OUT_OF_WINDOW" | "FAILED";
  signal: DeviceSignal;
  distanceFresh: boolean;
  victim: {
    name: string;
    phone: string | null;
    location: OperationsPoint | null;
  };
  inmate: {
    name: string;
    phone: string | null;
    location: OperationsPoint | null;
  };
  alertId: string | null;
};

export type OperationsPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export type OperationsTrack = {
  orderId: string;
  publicId: string;
  judicialRef: string | null;
  radiusMeters: number;
  geofenceState: string;
  lastDistanceM: number | null;
  lastCheckAt: string | null;
  victim: {
    name: string;
    location: OperationsPoint | null;
  };
  inmate: {
    name: string;
    location: OperationsPoint | null;
  };
  alertId: string | null;
};

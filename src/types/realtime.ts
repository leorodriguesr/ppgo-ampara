export type RealtimeEventType =
  | "violation.active"
  | "violation.updated"
  | "violation.cleared"
  | "order.suspended"
  | "device.revoked";

export type RealtimeViolationPayload = {
  type: Extract<RealtimeEventType, "violation.active" | "violation.updated">;
  alertPublicId: string;
  protectionOrderPublicId: string;
  distanceMeters: number;
  inmateLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  openedAt?: string;
};

export type RealtimeClearedPayload = {
  type: "violation.cleared";
  alertPublicId: string;
  clearedAt: string;
};

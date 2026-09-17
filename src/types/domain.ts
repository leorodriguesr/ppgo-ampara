export type {
  UserRole,
  ProtectionOrderStatus,
  PairingTokenStatus,
  DeviceStatus,
  AlertStatus,
  GeofenceState,
  AuditAction,
} from "@/generated/prisma/client";

export type PublicIds = {
  victimPublicId: string;
  inmatePublicId: string;
  protectionOrderPublicId: string;
  devicePublicId: string;
  alertPublicId: string;
};

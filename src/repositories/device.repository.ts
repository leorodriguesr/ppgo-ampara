import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const deviceListSelect = {
  publicId: true,
  platform: true,
  deviceBrand: true,
  deviceModel: true,
  status: true,
  pairedAt: true,
  lastSeenAt: true,
  pushToken: true,
} satisfies Prisma.DeviceSelect;

const activeDeviceWithOrderInclude = {
  protectionOrder: {
    include: {
      inmate: {
        select: {
          id: true,
          publicId: true,
          fullName: true,
          externalInmateId: true,
        },
      },
      victim: {
        select: {
          id: true,
          publicId: true,
          fullName: true,
          phone: true,
        },
      },
    },
  },
} satisfies Prisma.DeviceInclude;

export type ActiveDeviceWithOrder = Prisma.DeviceGetPayload<{
  include: typeof activeDeviceWithOrderInclude;
}>;

export async function listDevicesByProtectionOrderId(
  protectionOrderId: string,
) {
  return prisma.device.findMany({
    where: { protectionOrderId },
    orderBy: { pairedAt: "desc" },
    select: deviceListSelect,
  });
}

export async function createDevice(
  data: {
    protectionOrderId: string;
    platform: string;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    pushToken?: string | null;
    deviceTokenHash: string;
    appVersion?: string | null;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.device.create({
    data: {
      protectionOrderId: data.protectionOrderId,
      platform: data.platform,
      deviceBrand: data.deviceBrand,
      deviceModel: data.deviceModel,
      pushToken: data.pushToken,
      deviceTokenHash: data.deviceTokenHash,
      appVersion: data.appVersion,
      status: "ACTIVE",
    },
    select: {
      id: true,
      publicId: true,
      platform: true,
      status: true,
      pairedAt: true,
      lastSeenAt: true,
    },
  });
}

export async function revokeActiveDevices(
  protectionOrderId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.device.updateMany({
    where: {
      protectionOrderId,
      status: "ACTIVE",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });
}

export async function findActiveDeviceByTokenHash(deviceTokenHash: string) {
  return prisma.device.findFirst({
    where: {
      deviceTokenHash,
      status: "ACTIVE",
    },
    include: activeDeviceWithOrderInclude,
  });
}

export async function touchDeviceLastSeen(
  id: string,
  profile?: { deviceBrand?: string | null; deviceModel?: string | null },
) {
  return prisma.device.update({
    where: { id },
    data: {
      lastSeenAt: new Date(),
      ...(profile?.deviceBrand ? { deviceBrand: profile.deviceBrand } : {}),
      ...(profile?.deviceModel ? { deviceModel: profile.deviceModel } : {}),
    },
    select: { id: true, lastSeenAt: true },
  });
}

export async function updateDevicePushToken(id: string, pushToken: string) {
  return prisma.device.update({
    where: { id },
    data: { pushToken },
    select: { id: true, pushToken: true },
  });
}

export async function listActiveDevicesWithPushToken(protectionOrderId: string) {
  const devices = await prisma.device.findMany({
    where: {
      protectionOrderId,
      status: "ACTIVE",
      NOT: { pushToken: null },
    },
    select: {
      id: true,
      pushToken: true,
    },
  });

  return devices.filter(
    (device): device is { id: string; pushToken: string } =>
      typeof device.pushToken === "string" && device.pushToken.length > 0,
  );
}

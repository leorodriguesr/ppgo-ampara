import { prisma } from "@/lib/prisma";

export type CreateVictimLocationInput = {
  protectionOrderId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedAt: Date;
  source?: string;
};

export async function createVictimLocation(data: CreateVictimLocationInput) {
  return prisma.victimLocation.create({
    data: {
      protectionOrderId: data.protectionOrderId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: data.accuracyMeters ?? null,
      recordedAt: data.recordedAt,
      source: data.source ?? "APP",
    },
  });
}

export async function findLatestVictimLocation(protectionOrderId: string) {
  return prisma.victimLocation.findFirst({
    where: { protectionOrderId },
    orderBy: { recordedAt: "desc" },
  });
}

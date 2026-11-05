import { prisma } from "@/lib/prisma";

export async function findSimulatedInmateLocation(externalInmateId: string) {
  return prisma.simulatedInmateLocation.findUnique({
    where: { externalInmateId },
  });
}

export async function saveSimulatedInmateLocation(
  externalInmateId: string,
  latitude: number,
  longitude: number,
) {
  return prisma.simulatedInmateLocation.upsert({
    where: { externalInmateId },
    create: { externalInmateId, latitude, longitude },
    update: { latitude, longitude },
  });
}

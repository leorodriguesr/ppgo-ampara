import { prisma } from "@/lib/prisma";
import { victimLocationCutoff } from "@/services/retention-window";

export { victimLocationCutoff };

export async function purgeOldVictimLocations(now = new Date()) {
  const cutoff = victimLocationCutoff(now);
  return prisma.victimLocation.deleteMany({
    where: { recordedAt: { lt: cutoff } },
  });
}

let lastPurgeAt = 0;
const PURGE_GAP_MS = 60 * 60 * 1000;

export function scheduleVictimLocationPurge(now = Date.now()) {
  if (now - lastPurgeAt < PURGE_GAP_MS) return;
  lastPurgeAt = now;
  void purgeOldVictimLocations(new Date(now)).catch((error) => {
    lastPurgeAt = 0;
    console.error("[retention] falha ao apagar localizações antigas", error);
  });
}

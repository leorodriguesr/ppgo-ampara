import type { PairingTokenStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createPairingToken(data: {
  protectionOrderId: string;
  tokenHash: string;
  expiresAt: Date;
  createdById?: string | null;
}) {
  return prisma.pairingToken.create({
    data: {
      protectionOrderId: data.protectionOrderId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      createdById: data.createdById,
      status: "PENDING",
    },
  });
}

export async function findPairingTokenByHash(tokenHash: string) {
  return prisma.pairingToken.findUnique({
    where: { tokenHash },
    include: {
      protectionOrder: {
        select: {
          id: true,
          publicId: true,
          status: true,
          radiusMeters: true,
          judicialRef: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });
}

export async function revokePendingPairingTokens(
  protectionOrderId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.pairingToken.updateMany({
    where: {
      protectionOrderId,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });
}

export async function markPairingTokenRedeemed(
  id: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.pairingToken.update({
    where: { id },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
    },
  });
}

export async function markPairingTokenExpired(
  id: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.pairingToken.update({
    where: { id },
    data: { status: "EXPIRED" },
  });
}

export async function updatePairingTokenStatus(
  id: string,
  status: PairingTokenStatus,
) {
  return prisma.pairingToken.update({
    where: { id },
    data: { status },
  });
}

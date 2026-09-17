import { headers } from "next/headers";

import { rateLimitsConfig } from "@/config/rate-limits";
import { retentionConfig } from "@/config/retention";
import { getAppOrigin } from "@/config/sistema";
import { generateOpaqueToken, hashToken } from "@/lib/crypto";
import { AppError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
  GeneratePairingInput,
  RedeemPairingInput,
} from "@/modules/pairing/schemas";
import {
  createDevice,
  listDevicesByProtectionOrderId,
  revokeActiveDevices,
} from "@/repositories/device.repository";
import {
  createPairingToken,
  findPairingTokenByHash,
  markPairingTokenExpired,
  markPairingTokenRedeemed,
  revokePendingPairingTokens,
} from "@/repositories/pairing-token.repository";
import { findProtectionOrderById } from "@/repositories/protection-order.repository";
import { ensureProtectionOrderNotExpired } from "@/services/protection-order-expiry";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

const redeemHits = new Map<string, { count: number; resetAt: number }>();

async function getAppBaseUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  return getAppOrigin(host);
}

function resolveTtlSeconds(ttlSeconds?: number) {
  const fallback = retentionConfig.pairingTokenTtlSeconds;
  const value = ttlSeconds ?? fallback;
  return Math.min(900, Math.max(60, value));
}

function assertRedeemRateLimit(ip: string | null | undefined) {
  if (!ip) return;

  const windowMs = 60 * 60 * 1000;
  const limit = rateLimitsConfig.pairingRedeemPerIpPerHour;
  const now = Date.now();
  const entry = redeemHits.get(ip);

  if (!entry || entry.resetAt <= now) {
    redeemHits.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count += 1;
  if (entry.count > limit) {
    throw new AppError(
      "RATE_LIMITED",
      "Muitas tentativas de pareamento. Tente novamente mais tarde.",
      429,
    );
  }
}

function assertOrderPairable(status: string) {
  if (status !== "AWAITING_PAIRING" && status !== "ACTIVE") {
    throw new AppError(
      "ORDER_NOT_PAIRABLE",
      "Somente medidas aguardando pareamento ou ativas podem gerar acesso ao app",
      400,
    );
  }
}

export async function generatePairingService(
  protectionOrderId: string,
  input: GeneratePairingInput,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const orderRaw = await findProtectionOrderById(protectionOrderId);
  if (!orderRaw) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  const order = await ensureProtectionOrderNotExpired(orderRaw);
  assertOrderPairable(order.status);

  const activeDevices = await prisma.device.count({
    where: { protectionOrderId: order.id, status: "ACTIVE" },
  });
  if (activeDevices > 0) {
    throw new AppError(
      "DEVICE_STILL_ACTIVE",
      "Cancele o acesso do app antes de gerar um novo QR de pareamento",
      400,
    );
  }

  const ttlSeconds = resolveTtlSeconds(input.ttlSeconds);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);

  await revokePendingPairingTokens(order.id);

  const pairingToken = await createPairingToken({
    protectionOrderId: order.id,
    tokenHash,
    expiresAt,
    createdById: actorUserId,
  });

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PAIRING_TOKEN_GENERATED",
    entityType: "PairingToken",
    entityId: pairingToken.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      protectionOrderId: order.id,
      publicId: order.publicId,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds,
    },
  });

  const qrPayload = `mulhersegura://pair?token=${token}`;
  const webRedeemUrl = `${await getAppBaseUrl()}/pair?token=${encodeURIComponent(token)}`;

  return {
    expiresAt,
    qrPayload,
    token,
    ttlSeconds,
    webRedeemUrl,
  };
}

export async function revokePairingTokensService(
  protectionOrderId: string,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const order = await findProtectionOrderById(protectionOrderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  const result = await revokePendingPairingTokens(order.id);

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PAIRING_TOKEN_REVOKED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      revokedCount: result.count,
    },
  });

  return { revokedCount: result.count };
}

export async function redeemPairingService(
  input: RedeemPairingInput,
  meta?: AuditMeta,
) {
  assertRedeemRateLimit(meta?.ip);

  const tokenHash = hashToken(input.token);
  const pairingToken = await findPairingTokenByHash(tokenHash);

  if (!pairingToken) {
    throw new AppError("TOKEN_INVALID", "Token de pareamento inválido", 401);
  }

  if (pairingToken.status === "REDEEMED") {
    throw new AppError("TOKEN_USED", "Token de pareamento já utilizado", 409);
  }

  if (
    pairingToken.status === "REVOKED" ||
    pairingToken.status === "EXPIRED"
  ) {
    throw new AppError("TOKEN_INVALID", "Token de pareamento inválido", 401);
  }

  if (pairingToken.expiresAt.getTime() <= Date.now()) {
    await markPairingTokenExpired(pairingToken.id);
    throw new AppError("TOKEN_EXPIRED", "Token de pareamento expirado", 410);
  }

  const order = await ensureProtectionOrderNotExpired(
    pairingToken.protectionOrder,
  );
  if (order.status !== "AWAITING_PAIRING" && order.status !== "ACTIVE") {
    throw new AppError(
      "ORDER_NOT_PAIRABLE",
      "Esta medida não está disponível para pareamento",
      400,
    );
  }

  const deviceToken = generateOpaqueToken();
  const deviceTokenHash = hashToken(deviceToken);
  const previousStatus = order.status;

  const device = await prisma.$transaction(async (tx) => {
    await markPairingTokenRedeemed(pairingToken.id, tx);

    const revoked = await revokeActiveDevices(order.id, tx);

    const created = await createDevice(
      {
        protectionOrderId: order.id,
        platform: input.platform,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        pushToken: input.pushToken,
        deviceTokenHash,
        appVersion: input.appVersion,
      },
      tx,
    );

    if (previousStatus !== "ACTIVE") {
      await tx.protectionOrder.update({
        where: { id: order.id },
        data: { status: "ACTIVE" },
      });
    }

    return { created, revokedCount: revoked.count };
  });

  if (device.revokedCount > 0) {
    await writeAuditLog({
      actorType: "SYSTEM",
      action: "DEVICE_REVOKED",
      entityType: "ProtectionOrder",
      entityId: order.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        publicId: order.publicId,
        revokedCount: device.revokedCount,
        reason: "replaced_by_new_pairing",
      },
    });
  }

  await writeAuditLog({
    actorType: "DEVICE",
    action: "PAIRING_TOKEN_REDEEMED",
    entityType: "PairingToken",
    entityId: pairingToken.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      protectionOrderId: order.id,
      publicId: order.publicId,
      devicePublicId: device.created.publicId,
      platform: input.platform,
    },
  });

  if (previousStatus !== "ACTIVE") {
    await writeAuditLog({
      actorType: "SYSTEM",
      action: "PROTECTION_ORDER_STATUS_CHANGED",
      entityType: "ProtectionOrder",
      entityId: order.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: {
        publicId: order.publicId,
        from: previousStatus,
        to: "ACTIVE",
        reason: "pairing_redeemed",
      },
    });
  }

  return {
    deviceToken,
    protectionOrderPublicId: order.publicId,
    radiusMeters: order.radiusMeters,
    devicePublicId: device.created.publicId,
    judicialRef: order.judicialRef ?? null,
    startsAt: order.startsAt?.toISOString() ?? null,
    endsAt: order.endsAt?.toISOString() ?? null,
  };
}

export async function listDevicesForOrderService(protectionOrderId: string) {
  const order = await findProtectionOrderById(protectionOrderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  const devices = await listDevicesByProtectionOrderId(order.id);
  return {
    data: devices.map(({ pushToken, ...device }) => ({
      ...device,
      hasPushToken: Boolean(pushToken),
    })),
  };
}

/**
 * Cancela o acesso do app na medida: revoga devices ACTIVE e tokens PENDING.
 * A medida permanece; um novo QR pode ser gerado depois.
 */
export async function revokeDeviceAccessService(
  protectionOrderId: string,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const order = await findProtectionOrderById(protectionOrderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }

  if (order.status === "CLOSED") {
    throw new AppError(
      "ORDER_CLOSED",
      "Medida encerrada; não é possível alterar o acesso do app",
      400,
    );
  }

  const revokedDevices = await revokeActiveDevices(order.id);
  const revokedTokens = await revokePendingPairingTokens(order.id);

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "DEVICE_REVOKED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      publicId: order.publicId,
      revokedDevices: revokedDevices.count,
      revokedTokens: revokedTokens.count,
      reason: "access_cancelled_by_operator",
    },
  });

  return {
    revokedDevices: revokedDevices.count,
    revokedTokens: revokedTokens.count,
  };
}

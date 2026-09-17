import { AppError, NotFoundError } from "@/lib/errors";
import {
  localizarDetento,
  setMockInmateLocation,
  type LocalizarResponse,
} from "@/integrations/ankle-monitor";
import { findProtectionOrderById } from "@/repositories/protection-order.repository";
import { writeAuditLog } from "@/services/write-audit-log";

type AuditMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

type LatLng = {
  latitude: number;
  longitude: number;
};

async function loadOrderWithInmate(orderId: string) {
  const order = await findProtectionOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Medida protetiva não encontrada");
  }
  if (!order.inmate?.externalInmateId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Medida sem preso com ID externo de tornozeleira",
      400,
    );
  }
  return order;
}

/**
 * Define posição simulada do preso no mock store (somente modo MOCK).
 * Uso policial no painel — não cria novo AuditAction.
 */
export async function simulateInmateLocationForOrder(
  orderId: string,
  location: LatLng,
  actorUserId: string,
  meta?: AuditMeta,
) {
  const order = await loadOrderWithInmate(orderId);
  if (!order.isSimulation) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Simulação de posição só é permitida em medidas marcadas como simulação",
      400,
    );
  }

  const externalInmateId = order.inmate!.externalInmateId;

  const stored = setMockInmateLocation(
    externalInmateId,
    location.latitude,
    location.longitude,
  );

  await writeAuditLog({
    actorUserId,
    actorType: "USER",
    action: "PROTECTION_ORDER_UPDATED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {
      simulatedLocation: true,
      externalInmateId,
      latitude: stored.latitude,
      longitude: stored.longitude,
      updatedAt: stored.updatedAt,
    },
  });

  return {
    externalInmateId,
    latitude: stored.latitude,
    longitude: stored.longitude,
    updatedAt: stored.updatedAt,
  };
}

/**
 * Chama localizarDetento com o ID externo do preso da medida + coords da vítima.
 * Útil para teste no painel (mock ou live) antes da ETAPA 6.
 */
export async function testLocalizarForOrder(
  orderId: string,
  victimReference: LatLng,
  actorUserId?: string,
  meta?: AuditMeta,
): Promise<LocalizarResponse> {
  const order = await loadOrderWithInmate(orderId);
  const externalInmateId = order.inmate!.externalInmateId;

  try {
    return await localizarDetento({
      idDetento: externalInmateId,
      latitude: victimReference.latitude,
      longitude: victimReference.longitude,
      isSimulation: order.isSimulation,
    });
  } catch (error) {
    if (actorUserId) {
      await writeAuditLog({
        actorUserId,
        actorType: "USER",
        action: "EXTERNAL_API_ERROR",
        entityType: "ProtectionOrder",
        entityId: order.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
          externalInmateId,
          operation: "localizar",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }
}

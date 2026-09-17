import {
  closeProtectionOrdersByIds,
  findExpiredOpenProtectionOrders,
  updateProtectionOrderStatus,
} from "@/repositories/protection-order.repository";
import { writeAuditLog } from "@/services/write-audit-log";

type OrderWithExpiry = {
  id: string;
  publicId: string;
  status: string;
  endsAt: Date | null;
};

/**
 * Encerra em lote medidas com prazo (endsAt) já vencido.
 * Chamado em listagens e pontos de leitura.
 */
export async function expireDueProtectionOrders(): Promise<number> {
  const due = await findExpiredOpenProtectionOrders();
  if (due.length === 0) return 0;

  await closeProtectionOrdersByIds(due.map((order) => order.id));

  await Promise.all(
    due.map((order) =>
      writeAuditLog({
        actorType: "SYSTEM",
        action: "PROTECTION_ORDER_STATUS_CHANGED",
        entityType: "ProtectionOrder",
        entityId: order.id,
        metadata: {
          publicId: order.publicId,
          from: order.status,
          to: "CLOSED",
          reason: "ends_at_expired",
          endsAt: order.endsAt?.toISOString() ?? null,
        },
      }),
    ),
  );

  return due.length;
}

/**
 * Se a medida tem endsAt vencido e ainda não está CLOSED, encerra e devolve
 * o mesmo objeto com status CLOSED (preserva demais campos do caller).
 */
export async function ensureProtectionOrderNotExpired<T extends OrderWithExpiry>(
  order: T,
): Promise<T> {
  if (order.status === "CLOSED" || !order.endsAt) {
    return order;
  }

  if (order.endsAt.getTime() > Date.now()) {
    return order;
  }

  const previousStatus = order.status;
  await updateProtectionOrderStatus(order.id, "CLOSED");

  await writeAuditLog({
    actorType: "SYSTEM",
    action: "PROTECTION_ORDER_STATUS_CHANGED",
    entityType: "ProtectionOrder",
    entityId: order.id,
    metadata: {
      publicId: order.publicId,
      from: previousStatus,
      to: "CLOSED",
      reason: "ends_at_expired",
      endsAt: order.endsAt.toISOString(),
    },
  });

  return { ...order, status: "CLOSED" };
}

import { violationBlocksClosure } from "@/lib/protection-order-violation";
import { vigenciaEnded } from "@/lib/vigencia-day";
import {
  closeProtectionOrdersByIds,
  findExpiredOpenProtectionOrders,
  updateProtectionOrderStatus,
} from "@/repositories/protection-order.repository";
import { findLastTrackingPoint } from "@/repositories/tracking-point.repository";
import { writeAuditLog } from "@/services/write-audit-log";

/**
 * Violação confirmada no estado da medida, ou episódio do livro ainda sem ponto de saída.
 */
export async function isViolationOpen(order: {
  id: string;
  geofenceState: string;
}) {
  if (violationBlocksClosure(order.geofenceState)) return true;
  const last = await findLastTrackingPoint(order.id);
  return last?.zone === "VIOLATION";
}

type OrderWithExpiry = {
  id: string;
  publicId: string;
  status: string;
  endsAt: Date | null;
  geofenceState: string;
};

/**
 * Encerra em lote medidas com prazo (endsAt) já vencido.
 * Chamado em listagens e pontos de leitura.
 */
export async function expireDueProtectionOrders(): Promise<number> {
  const due = await findExpiredOpenProtectionOrders();
  if (due.length === 0) return 0;

  const closable = [];
  for (const order of due) {
    if (!order.endsAt || !vigenciaEnded(order.endsAt)) continue;
    if (await isViolationOpen(order)) continue;
    closable.push(order);
  }
  if (closable.length === 0) return 0;

  await closeProtectionOrdersByIds(closable.map((order) => order.id));

  await Promise.all(
    closable.map((order) =>
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

  return closable.length;
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

  if (!vigenciaEnded(order.endsAt)) {
    return order;
  }

  // O prazo judicial já passou, mas a violação ainda não terminou.
  if (await isViolationOpen(order)) {
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

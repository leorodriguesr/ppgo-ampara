import { hashToken } from "@/lib/crypto";
import { AppError, UnauthorizedError } from "@/lib/errors";
import {
  findActiveDeviceByTokenHash,
  touchDeviceLastSeen,
  type ActiveDeviceWithOrder,
} from "@/repositories/device.repository";
import { ensureProtectionOrderNotExpired } from "@/services/protection-order-expiry";

/**
 * Autentica dispositivo via `Authorization: Bearer <deviceToken>`.
 * Exige device ACTIVE e medida protetiva ACTIVE (encerra se o prazo venceu).
 */
export async function requireDeviceAuth(
  request: Request,
): Promise<ActiveDeviceWithOrder> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    throw new UnauthorizedError("Token de dispositivo ausente");
  }

  const token = header.slice("bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError("Token de dispositivo inválido");
  }

  const device = await findActiveDeviceByTokenHash(hashToken(token));
  if (!device) {
    throw new AppError(
      "DEVICE_UNAUTHORIZED",
      "Dispositivo não autorizado ou acesso revogado",
      401,
    );
  }

  const order = await ensureProtectionOrderNotExpired(device.protectionOrder);
  device.protectionOrder.status = order.status;

  if (order.status === "CLOSED") {
    throw new AppError(
      "ORDER_CLOSED",
      "Medida protetiva encerrada",
      403,
    );
  }

  if (order.status !== "ACTIVE") {
    throw new AppError(
      "ORDER_INACTIVE",
      "Medida protetiva não está ativa para este dispositivo",
      403,
    );
  }

  await touchDeviceLastSeen(device.id);

  return device;
}

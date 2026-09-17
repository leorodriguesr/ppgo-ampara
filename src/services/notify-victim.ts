import { sendExpoPushNotification } from "@/integrations/push/expo";
import { listActiveDevicesWithPushToken } from "@/repositories/device.repository";

const lastNotifyAt = new Map<string, number>();
const NOTIFY_THROTTLE_MS = 15_000;

export async function notifyVictimOfViolation(params: {
  protectionOrderId: string;
  distanceMeters: number | null;
}): Promise<void> {
  const last = lastNotifyAt.get(params.protectionOrderId) ?? 0;
  if (Date.now() - last < NOTIFY_THROTTLE_MS) return;
  lastNotifyAt.set(params.protectionOrderId, Date.now());

  const devices = await listActiveDevicesWithPushToken(params.protectionOrderId);
  if (devices.length === 0) {
    console.warn(
      `[push] nenhum token Expo na medida ${params.protectionOrderId}. No Expo Go o push remoto não registra; use um build nativo.`,
    );
    return;
  }

  const distance =
    params.distanceMeters != null && Number.isFinite(params.distanceMeters)
      ? ` Distância aproximada do agressor: ${Math.round(params.distanceMeters)} m.`
      : "";

  const results = await Promise.allSettled(
    devices.map((device) =>
      sendExpoPushNotification(device.pushToken, {
        title: "Violação da medida protetiva",
        body: `Procure um lugar seguro. A Polícia Penal já está a caminho.${distance}`,
        data: {
          type: "VIOLATION",
          screen: "map",
        },
      }),
    ),
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error(`[push] ${failed.length} envio(s) falharam`, failed);
  } else {
    console.info(`[push] notificação enviada para ${devices.length} aparelho(s)`);
  }
}

import { jsonError, jsonOk, requireDeviceAuth } from "@/lib/api";
import { heartbeatBodySchema } from "@/modules/proximity";
import { touchDeviceLastSeen } from "@/repositories/device.repository";
import { touchProtectionOrderContact } from "@/repositories/protection-order.repository";

export async function POST(request: Request) {
  try {
    const device = await requireDeviceAuth(request);
    const body = heartbeatBodySchema.parse(await request.json());
    const now = new Date();

    await touchDeviceLastSeen(device.id, {
      backgroundEnabled: body.backgroundEnabled,
    });
    await touchProtectionOrderContact(device.protectionOrderId, {
      lastContactAt: now,
      ...(body.gpsOk ? { lastGpsAt: now } : {}),
    });

    return jsonOk({ ok: true, serverTime: now.toISOString() });
  } catch (error) {
    return jsonError(error);
  }
}

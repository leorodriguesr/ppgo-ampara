import { jsonError, jsonOk, requireDeviceAuth } from "@/lib/api";
import { updatePushTokenSchema } from "@/modules/devices/schemas";
import { updateDevicePushToken } from "@/repositories/device.repository";

export async function PATCH(request: Request) {
  try {
    const device = await requireDeviceAuth(request);
    const body = updatePushTokenSchema.parse(await request.json());
    await updateDevicePushToken(device.id, body.pushToken);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

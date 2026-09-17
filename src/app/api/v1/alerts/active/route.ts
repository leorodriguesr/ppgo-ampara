import { jsonError, jsonOk, requireDeviceAuth } from "@/lib/api";
import { getActiveAlertForDevice } from "@/services/alerts";

export async function GET(request: Request) {
  try {
    const device = await requireDeviceAuth(request);
    const result = await getActiveAlertForDevice(device);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

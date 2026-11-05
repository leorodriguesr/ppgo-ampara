import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireDeviceAuth,
} from "@/lib/api";
import { proximityCheckBodySchema } from "@/modules/proximity";
import { touchDeviceLastSeen } from "@/repositories/device.repository";
import { checkProximityService } from "@/services/proximity";
import { scheduleVictimLocationPurge } from "@/services/retention";

export async function POST(request: Request) {
  try {
    const device = await requireDeviceAuth(request);
    const meta = await getRequestMeta();
    const body = proximityCheckBodySchema.parse(await request.json());

    if (
      body.deviceBrand ||
      body.deviceModel ||
      body.backgroundEnabled !== undefined
    ) {
      await touchDeviceLastSeen(device.id, {
        deviceBrand: body.deviceBrand,
        deviceModel: body.deviceModel,
        backgroundEnabled: body.backgroundEnabled,
      });
    }

    scheduleVictimLocationPurge();

    const result = await checkProximityService({
      device,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters,
      recordedAt: body.recordedAt,
      appState: body.appState,
      meta,
    });

    console.log("[proximity/check] resposta", {
      degraded: result.degraded,
      degradedReason: result.degradedReason ?? null,
      distanceMeters: result.distanceMeters,
      geofenceState: result.geofenceState,
      hasInmateLocation: Boolean(result.inmateLocation),
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

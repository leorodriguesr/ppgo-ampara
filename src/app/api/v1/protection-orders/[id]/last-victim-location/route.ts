import {
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { findProtectionOrderById } from "@/repositories/protection-order.repository";
import { findLatestVictimLocation } from "@/repositories/victim-location.repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;

    const order = await findProtectionOrderById(id);
    if (!order) {
      throw new NotFoundError("Medida protetiva não encontrada");
    }

    const location = await findLatestVictimLocation(order.id);
    if (!location) {
      return jsonOk({
        location: null,
        message:
          "Ainda não há localização enviada pelo app. Abra o mapa no celular e aguarde um ciclo.",
      });
    }

    return jsonOk({
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        recordedAt: location.recordedAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

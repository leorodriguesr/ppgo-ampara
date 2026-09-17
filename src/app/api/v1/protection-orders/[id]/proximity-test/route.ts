import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { proximityTestBodySchema } from "@/modules/proximity";
import { checkProximityForOrderAsPolice } from "@/services/proximity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = proximityTestBodySchema.parse(await request.json());

    const result = await checkProximityForOrderAsPolice(
      id,
      {
        latitude: body.latitude,
        longitude: body.longitude,
        accuracyMeters: body.accuracyMeters,
        appState: "foreground",
      },
      session.user.id,
      meta,
    );

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

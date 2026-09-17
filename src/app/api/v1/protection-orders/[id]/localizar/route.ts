import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { latLngBodySchema } from "@/modules/ankle-monitor/schemas";
import { testLocalizarForOrder } from "@/services/ankle-monitor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = latLngBodySchema.parse(await request.json());
    const result = await testLocalizarForOrder(
      id,
      body,
      session.user.id,
      meta,
    );
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { resolveAlertBodySchema } from "@/modules/alerts";
import { resolveAlertService } from "@/services/alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = resolveAlertBodySchema.parse(
      await request.json().catch(() => ({})),
    );

    const alert = await resolveAlertService(
      id,
      session.user.id,
      body,
      meta,
    );
    return jsonOk(alert);
  } catch (error) {
    return jsonError(error);
  }
}

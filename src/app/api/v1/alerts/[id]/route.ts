import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { getAlertService } from "@/services/alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const alert = await getAlertService(id);
    return jsonOk(alert);
  } catch (error) {
    return jsonError(error);
  }
}

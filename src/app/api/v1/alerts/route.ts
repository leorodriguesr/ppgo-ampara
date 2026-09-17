import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { listAlertsQuerySchema } from "@/modules/alerts";
import { listAlertsService } from "@/services/alerts";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const query = listAlertsQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      protectionOrderId: searchParams.get("protectionOrderId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const result = await listAlertsService(query);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

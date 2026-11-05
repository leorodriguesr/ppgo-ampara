import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { deleteTrackingReport } from "@/services/tracking";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { orderId } = await context.params;
    const { searchParams } = new URL(request.url);
    const result = await deleteTrackingReport({
      orderId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

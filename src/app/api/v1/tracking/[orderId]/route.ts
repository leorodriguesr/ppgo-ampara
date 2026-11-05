import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { deleteTrackingReport, getTrackingReport } from "@/services/tracking";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { orderId } = await context.params;
    const { searchParams } = new URL(request.url);
    const result = await getTrackingReport({
      orderId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!result.order) {
      throw new NotFoundError("Nenhum percurso neste período");
    }
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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

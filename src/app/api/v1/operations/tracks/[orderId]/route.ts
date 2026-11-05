import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { getOperationsTrack } from "@/services/operations";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { orderId } = await context.params;
    const track = await getOperationsTrack(orderId);
    if (!track) {
      throw new NotFoundError("Medida não encontrada");
    }
    return jsonOk(track);
  } catch (error) {
    return jsonError(error);
  }
}

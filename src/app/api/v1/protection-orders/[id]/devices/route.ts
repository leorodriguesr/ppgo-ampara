import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { listDevicesForOrderService } from "@/services/pairing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await listDevicesForOrderService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

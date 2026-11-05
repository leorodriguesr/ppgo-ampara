import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { deleteProtectionOrderService } from "@/services/protection-orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await deleteProtectionOrderService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

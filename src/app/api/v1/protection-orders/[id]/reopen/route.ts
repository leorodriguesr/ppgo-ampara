import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { reopenProtectionOrderSchema } from "@/modules/protection-orders/schemas";
import { reopenProtectionOrderService } from "@/services/protection-orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = reopenProtectionOrderSchema.parse(await request.json());
    const order = await reopenProtectionOrderService(
      id,
      body,
      session.user.id,
      meta,
    );
    return jsonOk(order);
  } catch (error) {
    return jsonError(error);
  }
}

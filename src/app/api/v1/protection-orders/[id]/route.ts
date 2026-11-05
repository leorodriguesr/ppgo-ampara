import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { updateProtectionOrderSchema } from "@/modules/protection-orders/schemas";
import {
  getProtectionOrderService,
  updateProtectionOrderService,
} from "@/services/protection-orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const order = await getProtectionOrderService(id);
    return jsonOk(order);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = updateProtectionOrderSchema.parse(await request.json());
    const order = await updateProtectionOrderService(
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


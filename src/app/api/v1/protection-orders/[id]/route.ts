import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { updateProtectionOrderSchema } from "@/modules/protection-orders/schemas";
import {
  deleteProtectionOrderService,
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

export async function PATCH(request: Request, context: RouteContext) {
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await deleteProtectionOrderService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

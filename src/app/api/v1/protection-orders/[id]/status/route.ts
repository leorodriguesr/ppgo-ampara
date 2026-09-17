import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { changeStatusSchema } from "@/modules/protection-orders/schemas";
import { changeProtectionOrderStatusService } from "@/services/protection-orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = changeStatusSchema.parse(await request.json());
    const order = await changeProtectionOrderStatusService(
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

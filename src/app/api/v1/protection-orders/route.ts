import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import {
  createProtectionOrderSchema,
  listProtectionOrdersQuerySchema,
} from "@/modules/protection-orders/schemas";
import {
  createProtectionOrderService,
  listProtectionOrdersService,
} from "@/services/protection-orders";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const query = listProtectionOrdersQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    const result = await listProtectionOrdersService(query);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const body = createProtectionOrderSchema.parse(await request.json());
    const order = await createProtectionOrderService(
      body,
      session.user.id,
      meta,
    );
    return jsonOk(order, 201);
  } catch (error) {
    return jsonError(error);
  }
}

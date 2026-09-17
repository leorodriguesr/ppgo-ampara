import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { updateInmateSchema } from "@/modules/inmates/schemas";
import { getInmateService, updateInmateService, deleteInmateService } from "@/services/inmates";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const inmate = await getInmateService(id);
    return jsonOk(inmate);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = updateInmateSchema.parse(await request.json());
    const inmate = await updateInmateService(id, body, session.user.id, meta);
    return jsonOk(inmate);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await deleteInmateService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

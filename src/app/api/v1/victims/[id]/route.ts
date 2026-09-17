import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { updateVictimSchema } from "@/modules/victims/schemas";
import { getVictimService, updateVictimService, deleteVictimService } from "@/services/victims";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const victim = await getVictimService(id);
    return jsonOk(victim);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const body = updateVictimSchema.parse(await request.json());
    const victim = await updateVictimService(id, body, session.user.id, meta);
    return jsonOk(victim);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await deleteVictimService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

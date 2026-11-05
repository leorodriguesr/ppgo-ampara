import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { deleteVictimService } from "@/services/victims";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
    const { id } = await context.params;
    const result = await deleteVictimService(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { revokePairingTokensService } from "@/services/pairing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;
    const result = await revokePairingTokensService(id, session.user.id, meta);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

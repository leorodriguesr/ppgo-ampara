import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import { generatePairingSchema } from "@/modules/pairing/schemas";
import { generatePairingService } from "@/services/pairing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const { id } = await context.params;

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const input = generatePairingSchema.parse(body);
    const result = await generatePairingService(
      id,
      input,
      session.user.id,
      meta,
    );
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}

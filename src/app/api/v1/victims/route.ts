import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import {
  createVictimSchema,
  listVictimsQuerySchema,
} from "@/modules/victims/schemas";
import {
  createVictimService,
  listVictimsService,
} from "@/services/victims";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const query = listVictimsQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    const result = await listVictimsService(query);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const body = createVictimSchema.parse(await request.json());
    const victim = await createVictimService(body, session.user.id, meta);
    return jsonOk(victim, 201);
  } catch (error) {
    return jsonError(error);
  }
}

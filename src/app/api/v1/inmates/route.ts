import {
  getRequestMeta,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api";
import {
  createInmateSchema,
  listInmatesQuerySchema,
} from "@/modules/inmates/schemas";
import {
  createInmateService,
  listInmatesService,
} from "@/services/inmates";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const query = listInmatesQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    const result = await listInmatesService(query);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const meta = await getRequestMeta();
    const body = createInmateSchema.parse(await request.json());
    const inmate = await createInmateService(body, session.user.id, meta);
    return jsonOk(inmate, 201);
  } catch (error) {
    return jsonError(error);
  }
}

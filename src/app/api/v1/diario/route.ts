import { z } from "zod";

import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { listDiary, recordDiaryDecision } from "@/services/tracking";

const decisionSchema = z.object({
  entryPointId: z.string().min(1),
  actions: z.string().max(2000).nullable().optional(),
  finalize: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const entries = await listDiary({
      q: searchParams.get("q") ?? undefined,
      day:
        searchParams.get("day") ??
        searchParams.get("from") ??
        undefined,
    });
    return jsonOk({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = decisionSchema.parse(await request.json());
    const actions = body.actions?.trim() ? body.actions.trim() : null;
    const saved = await recordDiaryDecision({
      entryPointId: body.entryPointId,
      actions,
      reviewedById: session.user.id,
      finalize: body.finalize,
    });
    if (!saved) {
      throw new NotFoundError("Ocorrência de violação não encontrada");
    }
    return jsonOk({ id: saved.id });
  } catch (error) {
    return jsonError(error);
  }
}

import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { getOperationsBoard } from "@/services/operations";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const scope = new URL(request.url).searchParams.get("scope");
    const board = await getOperationsBoard({
      includeClear: scope === "all",
    });
    return jsonOk(board);
  } catch (error) {
    return jsonError(error);
  }
}

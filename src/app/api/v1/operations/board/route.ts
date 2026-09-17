import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { getOperationsBoard } from "@/services/operations";

export async function GET() {
  try {
    await requireApiSession();
    const board = await getOperationsBoard();
    return jsonOk(board);
  } catch (error) {
    return jsonError(error);
  }
}

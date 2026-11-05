import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { listTrackingReports } from "@/services/tracking";

export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const result = await listTrackingReports({
      q: searchParams.get("q") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}

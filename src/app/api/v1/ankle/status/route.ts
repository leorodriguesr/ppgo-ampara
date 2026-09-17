import { jsonError, jsonOk, requireApiSession } from "@/lib/api";
import { isGuardiaoConfigured } from "@/integrations/ankle-monitor";

export async function GET() {
  try {
    await requireApiSession();
    return jsonOk({
      mode: isGuardiaoConfigured() ? ("live" as const) : ("mock" as const),
    });
  } catch (error) {
    return jsonError(error);
  }
}

import { getRequestMeta, jsonError, jsonOk } from "@/lib/api";
import { redeemPairingSchema } from "@/modules/pairing/schemas";
import { redeemPairingService } from "@/services/pairing";

export async function POST(request: Request) {
  try {
    const meta = await getRequestMeta();
    const body = redeemPairingSchema.parse(await request.json());
    const result = await redeemPairingService(body, meta);
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}

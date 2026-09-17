import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const generatePairingSchema = z.object({
  ttlSeconds: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(60).max(900).optional(),
  ),
});

export const redeemPairingSchema = z.object({
  token: z.string().trim().min(1, "Token obrigatório"),
  platform: z.enum(["ios", "android", "web"]),
  pushToken: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(512).optional(),
  ),
  appVersion: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(64).optional(),
  ),
  deviceBrand: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(80).optional(),
  ),
  deviceModel: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
});

export type GeneratePairingInput = z.infer<typeof generatePairingSchema>;
export type RedeemPairingInput = z.infer<typeof redeemPairingSchema>;

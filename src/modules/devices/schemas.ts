import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const updatePushTokenSchema = z.object({
  pushToken: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(20).max(512),
  ),
});

export type UpdatePushTokenInput = z.infer<typeof updatePushTokenSchema>;

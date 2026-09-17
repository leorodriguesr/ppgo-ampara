import { z } from "zod";

export const proximityCheckBodySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Latitude inválida")
    .max(90, "Latitude inválida"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude inválida")
    .max(180, "Longitude inválida"),
  accuracyMeters: z.coerce.number().positive().max(10_000).optional(),
  recordedAt: z.coerce.date().optional(),
  appState: z.enum(["foreground", "background"]).optional(),
  deviceBrand: z.string().trim().max(80).optional(),
  deviceModel: z.string().trim().max(120).optional(),
});

export const proximityTestBodySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Latitude inválida")
    .max(90, "Latitude inválida"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude inválida")
    .max(180, "Longitude inválida"),
  accuracyMeters: z.coerce.number().positive().max(10_000).optional(),
});

export type ProximityCheckBody = z.infer<typeof proximityCheckBodySchema>;
export type ProximityTestBody = z.infer<typeof proximityTestBodySchema>;

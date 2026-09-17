import { z } from "zod";

export const latLngBodySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Latitude inválida")
    .max(90, "Latitude inválida"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude inválida")
    .max(180, "Longitude inválida"),
});

export type LatLngBody = z.infer<typeof latLngBodySchema>;

import { z } from "zod";

function optionalText(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value?.trim() ?? "";
      return trimmed ? trimmed : null;
    });
}

export const addressSchema = z.object({
  addressZip: optionalText(9),
  addressStreet: optionalText(200),
  addressNumber: optionalText(20),
  addressComplement: optionalText(100),
  addressDistrict: optionalText(100),
  addressCity: optionalText(100),
  addressState: z
    .union([z.string().trim().toUpperCase().max(2), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value?.trim().toUpperCase() ?? "";
      return trimmed ? trimmed : null;
    }),
});

export type AddressInput = z.infer<typeof addressSchema>;

export function addressColumns(input: Partial<AddressInput>) {
  return {
    addressZip: input.addressZip,
    addressStreet: input.addressStreet,
    addressNumber: input.addressNumber,
    addressComplement: input.addressComplement,
    addressDistrict: input.addressDistrict,
    addressCity: input.addressCity,
    addressState: input.addressState,
  };
}

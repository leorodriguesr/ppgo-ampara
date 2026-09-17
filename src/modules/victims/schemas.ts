import { z } from "zod";

export const createVictimSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe o nome completo (mín. 3 caracteres)")
    .max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  document: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});

export const updateVictimSchema = createVictimSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Informe ao menos um campo para atualizar" },
);

export const listVictimsQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateVictimInput = z.infer<typeof createVictimSchema>;
export type UpdateVictimInput = z.infer<typeof updateVictimSchema>;

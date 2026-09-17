import { z } from "zod";

export const createInmateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe o nome completo (mín. 3 caracteres)")
    .max(200),
  externalInmateId: z
    .string()
    .trim()
    .min(1, "Informe o ID do detento/tornozeleira")
    .max(100),
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

export const updateInmateSchema = createInmateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Informe ao menos um campo para atualizar" },
);

export const listInmatesQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInmateInput = z.infer<typeof createInmateSchema>;
export type UpdateInmateInput = z.infer<typeof updateInmateSchema>;

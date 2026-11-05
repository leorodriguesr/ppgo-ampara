import { z } from "zod";

import {
  snapVigenciaEnd,
  snapVigenciaStart,
  toDateInputValue,
} from "@/lib/vigencia-day";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(200).optional(),
);

const requiredJudicialRef = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .min(1, "Informe a referência judicial do processo")
    .max(200),
);

const optionalDate = z.preprocess(
  snapVigenciaStart,
  z.coerce.date().optional(),
);

const requiredEndsAt = z.preprocess(
  snapVigenciaEnd,
  z.coerce.date({
    error: "Informe o prazo de término da medida",
  }),
);

const optionalEndsAt = z.preprocess(
  snapVigenciaEnd,
  z.coerce.date().optional(),
);

const protectionOrderStatusFilter = z.enum([
  "DRAFT",
  "AWAITING_PAIRING",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
]);

export const createProtectionOrderSchema = z
  .object({
    victimId: z.string().trim().min(1, "Selecione a vítima"),
    inmateId: z.string().trim().min(1, "Selecione o preso"),
    radiusMeters: z.coerce
      .number()
      .int("O raio deve ser um número inteiro")
      .min(50, "Raio mínimo: 50 m")
      .max(50000, "Raio máximo: 50.000 m")
      .default(300),
    watchRadiusMeters: z.coerce
      .number()
      .int("O raio de visualização deve ser um número inteiro")
      .min(50, "Raio de visualização mínimo: 50 m")
      .max(50000, "Raio de visualização máximo: 50.000 m")
      .default(1000),
    isSimulation: z.boolean().default(true),
    judicialRef: requiredJudicialRef,
    startsAt: optionalDate,
    endsAt: requiredEndsAt,
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt.getTime() >= data.startsAt.getTime();
      }
      return true;
    },
    {
      message: "A data de término deve ser igual ou posterior ao início",
      path: ["endsAt"],
    },
  )
  .refine((data) => data.endsAt.getTime() > Date.now(), {
    message: "O prazo de término deve ser uma data futura",
    path: ["endsAt"],
  })
  .refine((data) => data.watchRadiusMeters > data.radiusMeters, {
    message:
      "O raio de visualização do policial deve ser maior que o raio da vítima",
    path: ["watchRadiusMeters"],
  });

export const updateProtectionOrderSchema = z
  .object({
    radiusMeters: z.coerce
      .number()
      .int("O raio deve ser um número inteiro")
      .min(50, "Raio mínimo: 50 m")
      .max(50000, "Raio máximo: 50.000 m")
      .optional(),
    watchRadiusMeters: z.coerce
      .number()
      .int("O raio de visualização deve ser um número inteiro")
      .min(50, "Raio de visualização mínimo: 50 m")
      .max(50000, "Raio de visualização máximo: 50.000 m")
      .optional(),
    isSimulation: z.boolean().optional(),
    judicialRef: optionalText,
    startsAt: optionalDate,
    endsAt: optionalEndsAt,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt.getTime() >= data.startsAt.getTime();
      }
      return true;
    },
    {
      message: "A data de término deve ser igual ou posterior ao início",
      path: ["endsAt"],
    },
  );

export const changeStatusSchema = z.object({
  status: z.enum(["AWAITING_PAIRING", "CLOSED"]),
});

export const reopenProtectionOrderSchema = z.object({
  endsAt: z.preprocess(
    snapVigenciaEnd,
    z.coerce.date({
      error: "Informe o novo prazo de término",
    }),
  ),
}).refine((data) => {
  const selected = toDateInputValue(data.endsAt);
  const today = toDateInputValue(new Date());
  return selected >= today;
}, {
  message:
    "O novo término não pode ser anterior a hoje.",
  path: ["endsAt"],
});

export const listProtectionOrdersQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: protectionOrderStatusFilter.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProtectionOrderInput = z.infer<
  typeof createProtectionOrderSchema
>;
export type UpdateProtectionOrderInput = z.infer<
  typeof updateProtectionOrderSchema
>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ReopenProtectionOrderInput = z.infer<
  typeof reopenProtectionOrderSchema
>;

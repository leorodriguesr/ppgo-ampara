import { z } from "zod";

export const listAlertsQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["OPEN", "RESOLVED", "FALSE_POSITIVE"]).optional(),
  protectionOrderId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const resolveAlertBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
  status: z.enum(["RESOLVED", "FALSE_POSITIVE"]).optional(),
});

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
export type ResolveAlertBody = z.infer<typeof resolveAlertBodySchema>;

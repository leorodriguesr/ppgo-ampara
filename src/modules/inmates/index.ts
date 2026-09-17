/** Bounded context: presos — CRUD na ETAPA 2. */
export {
  createInmateSchema,
  updateInmateSchema,
  listInmatesQuerySchema,
  type CreateInmateInput,
  type UpdateInmateInput,
} from "@/modules/inmates/schemas";

export {
  createInmateService,
  updateInmateService,
  getInmateService,
  listInmatesService,
} from "@/services/inmates";

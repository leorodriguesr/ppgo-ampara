/** Bounded context: vítimas — CRUD na ETAPA 2. */
export {
  createVictimSchema,
  updateVictimSchema,
  listVictimsQuerySchema,
  type CreateVictimInput,
  type UpdateVictimInput,
} from "@/modules/victims/schemas";

export {
  createVictimService,
  updateVictimService,
  getVictimService,
  listVictimsService,
} from "@/services/victims";

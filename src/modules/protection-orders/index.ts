/** Bounded context: medidas protetivas — CRUD na ETAPA 3. */
export {
  createProtectionOrderSchema,
  updateProtectionOrderSchema,
  changeStatusSchema,
  reopenProtectionOrderSchema,
  listProtectionOrdersQuerySchema,
  type CreateProtectionOrderInput,
  type UpdateProtectionOrderInput,
  type ChangeStatusInput,
  type ReopenProtectionOrderInput,
} from "@/modules/protection-orders/schemas";

export {
  createProtectionOrderService,
  updateProtectionOrderService,
  changeProtectionOrderStatusService,
  reopenProtectionOrderService,
  getProtectionOrderService,
  listProtectionOrdersService,
} from "@/services/protection-orders";
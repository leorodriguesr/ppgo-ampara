import type { CreateAuditLogInput } from "@/repositories/audit-log.repository";
import { createAuditLog } from "@/repositories/audit-log.repository";

/**
 * Utilitário de auditoria (ETAPA 1).
 * Pronto para uso nas próximas etapas — ainda não acoplado aos fluxos de negócio.
 */
export async function writeAuditLog(input: CreateAuditLogInput) {
  try {
    return await createAuditLog(input);
  } catch (error) {
    // Auditoria não deve derrubar a operação principal.
    console.error("[audit] failed to write audit log", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
    return null;
  }
}

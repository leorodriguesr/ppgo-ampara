/** Políticas de retenção LGPD. */
export const retentionConfig = {
  victimLocationHours: 48,
  pairingTokenTtlSeconds: 300,
  auditLogMonths: 24,
  alertRetentionMonths: 24,
} as const;

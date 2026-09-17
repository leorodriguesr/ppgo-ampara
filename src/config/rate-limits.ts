/** Placeholders para rate limiting nas etapas de pairing/proximity. */
export const rateLimitsConfig = {
  pairingRedeemPerIpPerHour: 20,
  proximityCheckPerDevicePerMinute: 30,
} as const;

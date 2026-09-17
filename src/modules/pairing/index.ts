/** Bounded context: pareamento QR — ETAPA 4. */
export {
  generatePairingSchema,
  redeemPairingSchema,
  type GeneratePairingInput,
  type RedeemPairingInput,
} from "@/modules/pairing/schemas";

export {
  generatePairingService,
  revokePairingTokensService,
  redeemPairingService,
  listDevicesForOrderService,
  revokeDeviceAccessService,
} from "@/services/pairing";

import { createHash, randomBytes } from "node:crypto";

/** Gera token opaco de alta entropia (uso futuro: pairing / device). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Hash SHA-256 em hex para armazenar tokens sem plaintext. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

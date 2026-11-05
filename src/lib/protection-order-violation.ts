/** Violação confirmada ou saída ainda não confirmada: o episódio segue aberto. */
export function violationBlocksClosure(
  geofenceState: string | null | undefined,
) {
  return geofenceState === "VIOLATING" || geofenceState === "PENDING_SAFE";
}

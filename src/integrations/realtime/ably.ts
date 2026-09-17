/**
 * Publisher realtime (Ably) — reservado para ETAPA 8.
 */
export async function publishRealtimeEvent(
  channel: string,
  event: string,
  payload: unknown,
): Promise<void> {
  void channel;
  void event;
  void payload;
  throw new Error("Realtime ainda não implementado (ETAPA 8).");
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { formatDate } from "@/lib/format";
import type { OperationsTrack } from "@/types/operations";
import { cn } from "@/lib/utils";

const OperationsMap = dynamic(
  () =>
    import("@/components/operations/operations-map").then(
      (mod) => mod.OperationsMap,
    ),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#E8EAED]" /> },
);

type BoardResponse = {
  tracks: OperationsTrack[];
  violatingCount: number;
  monitoredCount: number;
};

function formatDistance(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function stateLabel(state: string) {
  switch (state) {
    case "VIOLATING":
      return "Em violação";
    case "PENDING_VIOLATION":
      return "Confirmando";
    case "PENDING_SAFE":
      return "Saindo da zona";
    case "SAFE":
      return "Dentro da medida";
    default:
      return state;
  }
}

export function OperationsBoard() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/operations/board", {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "Não foi possível carregar o painel",
          );
        }
        if (!cancelled) {
          setBoard(data as BoardResponse);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar o painel");
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const violations = useMemo(
    () =>
      (board?.tracks ?? []).filter(
        (track) => track.geofenceState === "VIOLATING",
      ),
    [board],
  );

  const selected =
    board?.tracks.find((track) => track.orderId === selectedOrderId) ??
    violations[0] ??
    null;

  return (
    <div className="flex h-[calc(100svh-48px)] min-h-[520px] flex-col md:h-svh md:flex-row">
      <section className="relative min-h-[280px] flex-1">
        <OperationsMap
          tracks={board?.tracks ?? []}
          selectedOrderId={selected?.orderId ?? null}
          onSelect={setSelectedOrderId}
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <div className="pointer-events-auto rounded-md bg-white/95 px-3 py-2 text-xs shadow-sm ring-1 ring-black/5">
            <p className="font-medium text-[#1B2A41]">Acompanhamento</p>
            <p className="mt-0.5 text-[#5B6470]">
              {board
                ? `${board.monitoredCount} medida${board.monitoredCount === 1 ? "" : "s"} ativa${board.monitoredCount === 1 ? "" : "s"}`
                : "Carregando…"}
            </p>
          </div>
          <div
            className={cn(
              "pointer-events-auto rounded-md px-3 py-2 text-xs shadow-sm ring-1",
              (board?.violatingCount ?? 0) > 0
                ? "bg-[#C62828] text-white ring-[#C62828]"
                : "bg-white/95 text-[#1B2A41] ring-black/5",
            )}
          >
            <p className="font-medium">Violações</p>
            <p className="mt-0.5 opacity-90">
              {board?.violatingCount ?? 0} em andamento
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md bg-white/95 px-3 py-2 text-[11px] text-[#5B6470] shadow-sm ring-1 ring-black/5">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2563EB]" />
            Vítima
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#C62828]" />
            Preso em violação
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#4B5563]" />
            Preso
          </span>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-[#E2E5EA] bg-white md:w-[360px] md:border-l md:border-t-0">
        <div className="border-b border-[#E2E5EA] px-4 py-3">
          <h1 className="text-sm font-semibold text-[#1B2A41]">Painel Geral</h1>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Monitoramento das medidas ativas
          </p>
        </div>

        {error ? (
          <p className="px-4 py-3 text-sm text-[#C62828]">{error}</p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {violations.length === 0 && board ? (
            <p className="px-4 py-6 text-sm text-[#6B7280]">
              Nenhuma violação no momento. O mapa mostra as posições conhecidas
              das vítimas e dos presos nas medidas ativas.
            </p>
          ) : null}

          {violations.map((track) => {
            const active = selected?.orderId === track.orderId;
            return (
              <button
                key={track.orderId}
                type="button"
                onClick={() => setSelectedOrderId(track.orderId)}
                className={cn(
                  "w-full border-b border-[#F0F2F5] px-4 py-3 text-left transition-colors",
                  active ? "bg-[#F8EAEA]" : "hover:bg-[#F7F8FA]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C62828]">
                    Violação
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    {track.lastCheckAt ? formatDate(track.lastCheckAt) : "—"}
                  </p>
                </div>
                <p className="mt-1 text-sm font-medium text-[#1B2A41]">
                  {track.inmate.name}
                </p>
                <p className="mt-0.5 text-xs text-[#4B5563]">
                  Vítima: {track.victim.name}
                </p>
                {track.victim.location ? (
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Posição da vítima: {track.victim.location.latitude.toFixed(5)},{" "}
                    {track.victim.location.longitude.toFixed(5)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Sem posição recente da vítima
                  </p>
                )}
                <p className="mt-1 text-xs font-medium text-[#1B2A41]">
                  Distância aproximada do agressor:{" "}
                  {formatDistance(track.lastDistanceM)}
                </p>
              </button>
            );
          })}

          {board && board.tracks.length > 0 ? (
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Medidas ativas
              </p>
              <ul className="space-y-1">
                {board.tracks.map((track) => (
                  <li key={track.orderId}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(track.orderId)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[#F7F8FA]"
                    >
                      <span className="min-w-0 truncate text-[#1B2A41]">
                        {track.inmate.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0",
                          track.geofenceState === "VIOLATING"
                            ? "font-medium text-[#C62828]"
                            : "text-[#6B7280]",
                        )}
                      >
                        {stateLabel(track.geofenceState)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="border-t border-[#E2E5EA] px-4 py-3 text-xs">
            <Link
              href={`/protection-orders/${selected.orderId}`}
              className="font-medium text-[#1B2A41] underline-offset-2 hover:underline"
            >
              Abrir medida
              {selected.judicialRef ? ` · ${selected.judicialRef}` : ""}
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

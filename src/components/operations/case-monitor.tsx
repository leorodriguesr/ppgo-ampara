"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, Phone } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { geofenceConfig } from "@/config/geofence";
import { cn } from "@/lib/utils";
import type { OperationsPoint, OperationsTrack } from "@/types/operations";

const OperationsMap = dynamic(
  () =>
    import("@/components/operations/operations-map").then(
      (mod) => mod.OperationsMap,
    ),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#E8EAED]" /> },
);

function formatDistance(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function caseRefreshMs(track: OperationsTrack | null) {
  if (track?.zone === "violation") {
    return geofenceConfig.intervals.liveViolationSeconds * 1000;
  }
  if (
    track?.geofenceState === "PENDING_VIOLATION" ||
    track?.geofenceState === "PENDING_SAFE"
  ) {
    return geofenceConfig.intervals.liveViolatingSeconds * 1000;
  }
  return geofenceConfig.intervals.liveSeconds * 1000;
}

function situation(track: OperationsTrack) {
  if (track.zone === "violation") return "Em violação";
  if (track.zone === "watch") return "Atenção";
  return "Sem aproximação";
}

function reading(track: OperationsTrack) {
  if (track.lastDistanceM == null) return "Sem posição recente do preso.";
  const distance = Math.round(track.lastDistanceM);
  if (track.zone === "violation") {
    const inside = Math.max(0, Math.round(track.radiusMeters - distance));
    return `${inside} m dentro do raio proibido.`;
  }
  if (track.zone === "watch") {
    const until = Math.max(0, Math.round(distance - track.radiusMeters));
    return `${until} m até o raio da violação. Acompanhe e avise a vítima se a distância cair.`;
  }
  return "Fora da área de atenção. A medida segue em observação.";
}

function phoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("55") && digits.length <= 11) digits = `55${digits}`;
  return digits;
}

function whatsappHref(phone: string) {
  return `https://wa.me/${phoneDigits(phone)}`;
}

function telHref(phone: string) {
  return `tel:+${phoneDigits(phone)}`;
}

function directionsHref(point: OperationsPoint) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
}

type PositionZone = "WATCH" | "VIOLATION" | "OUTSIDE" | null;

type PositionLine = {
  id: string;
  text: string;
  zone: PositionZone;
};

function lineTone(zone: PositionZone) {
  if (zone === "VIOLATION") {
    return {
      dot: "bg-[#C62828]",
      stem: "bg-[#C62828]/45",
      ring: "ring-[#C62828]",
    };
  }
  if (zone === "WATCH") {
    return {
      dot: "bg-[#D97706]",
      stem: "bg-[#D97706]/50",
      ring: "ring-[#D97706]",
    };
  }
  if (zone === "OUTSIDE") {
    return {
      dot: "bg-[#2E7D32]",
      stem: "bg-[#2E7D32]/40",
      ring: "ring-[#2E7D32]",
    };
  }
  return {
    dot: "bg-[#1B2A41] dark:bg-white/80",
    stem: "bg-[#C5CDD6] dark:bg-white/25",
    ring: "ring-[#1B2A41] dark:ring-white",
  };
}

function saoPauloDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatClock(iso: string | null | undefined) {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function CaseMonitor({ orderId }: { orderId: string }) {
  const [track, setTrack] = useState<OperationsTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [closedAlertId, setClosedAlertId] = useState<string | null>(null);
  const [lines, setLines] = useState<PositionLine[]>([]);
  const [freshId, setFreshId] = useState<string | null>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const pendingRevealRef = useRef<string | null>(null);
  const refreshMs = caseRefreshMs(track);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/v1/operations/tracks/${orderId}`, {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as OperationsTrack & {
          message?: string;
        };
        if (!res.ok) {
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "Não foi possível carregar o caso",
          );
        }
        if (!cancelled) {
          setTrack(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar o caso");
        }
      }
    };

    const loadPositions = async () => {
      const day = saoPauloDay();
      try {
        const res = await fetch(
          `/api/v1/tracking/${orderId}?from=${day}&to=${day}`,
          { credentials: "include" },
        );
        if (cancelled) return;
        if (res.status === 404) {
          setLines([]);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          narrative?: Array<{ id: string; text: string; zone: PositionZone }>;
        };
        setLines(
          (data.narrative ?? []).map((item) => ({
            id: item.id,
            text: item.text,
            zone: item.zone ?? null,
          })),
        );
      } catch {
        // A ocorrência segue no mapa mesmo se o relato ainda não chegou.
      }
    };

    void load();
    void loadPositions();
    const id = window.setInterval(() => {
      void load();
      void loadPositions();
    }, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, refreshMs]);

  useEffect(() => {
    if (!track) {
      document.title = "Acompanhamento";
      return;
    }
    document.title = `${track.victim.name} · ${formatDistance(track.lastDistanceM)}`;
  }, [track]);

  useEffect(() => {
    knownIdsRef.current = null;
    pendingRevealRef.current = null;
    setFreshId(null);
  }, [orderId]);

  useEffect(() => {
    if (lines.length === 0) {
      knownIdsRef.current = null;
      pendingRevealRef.current = null;
      return;
    }

    const ids = new Set(lines.map((line) => line.id));
    const known = knownIdsRef.current;
    const added = known ? lines.filter((line) => !known.has(line.id)) : lines;
    knownIdsRef.current = ids;

    if (added.length > 0) {
      const newest = added[added.length - 1].id;
      pendingRevealRef.current = newest;
      setFreshId(newest);
    }

    const revealId = pendingRevealRef.current;
    const list = linesRef.current;
    if (!revealId || !list) return;

    const node = list.querySelector<HTMLElement>(
      `[data-line-id="${CSS.escape(revealId)}"]`,
    );
    if (!node) {
      list.scrollTop = list.scrollHeight;
    } else {
      list.scrollTo({
        top: node.offsetTop + node.offsetHeight - list.clientHeight,
        behavior: known ? "smooth" : "auto",
      });
    }
    pendingRevealRef.current = null;
  }, [lines, track]);

  async function resolveAlert(status: "RESOLVED" | "FALSE_POSITIVE") {
    if (!track?.alertId) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/alerts/${track.alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setActionError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível encerrar o alerta",
        );
        return;
      }
      setClosedAlertId(track.alertId);
      setReason("");
    } catch {
      setActionError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  const zone = track?.zone;
  const distanceClass =
    zone === "violation"
      ? "text-[#C62828] dark:text-red-200"
      : zone === "watch"
        ? "text-[#B45309] dark:text-amber-200"
        : "text-[#1B2A41] dark:text-white";
  const bar =
    zone === "violation" ? "bg-[#C62828]" : zone === "watch" ? "bg-[#D97706]" : "bg-[#1B2A41]/30 dark:bg-white/25";
  const openAlert = track?.alertId && track.alertId !== closedAlertId ? track.alertId : null;

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#E8EAED] dark:bg-[#262626]">
      <div className="absolute inset-0 z-0">
        <OperationsMap
          tracks={track ? [track] : []}
          focusOrderId={track?.orderId ?? null}
          focusTick={1}
          onSelect={() => undefined}
        />
      </div>

      <Link
        href="/"
        className="absolute top-3 left-3 z-[500] bg-white px-3 py-2 text-sm text-[#1B2A41] ring-1 ring-[#D8DEE6] backdrop-blur-sm hover:bg-[#F4F6F8] dark:bg-[#262626]/90 dark:text-white dark:ring-white/15 dark:hover:bg-[#262626]"
      >
        Voltar ao mapa
      </Link>
      <div className="absolute top-4 right-4 z-[500] md:right-[404px]">
        <ThemeToggle />
      </div>

      <aside className="absolute inset-x-3 bottom-3 z-[500] flex h-[58vh] flex-col overflow-hidden bg-white/95 text-[#1B2A41] ring-1 ring-[#D8DEE6] backdrop-blur-sm md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:h-auto md:w-[380px] dark:bg-[#262626]/95 dark:text-white dark:ring-white/12">
        <div className="relative shrink-0 px-4 pt-4 pb-3">
          <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", bar)} />
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">{track ? situation(track) : "Acompanhamento"}</p>
            <p className="font-mono text-[11px] tabular-nums text-[#6B7280] dark:text-white/45">
              {track?.lastCheckAt ? formatClock(track.lastCheckAt) : "—"}
            </p>
          </div>
          {track ? (
            <p className="mt-1 text-[11px] text-[#6B7280] dark:text-white/45">
              Contato {formatClock(track.lastContactAt)} · GPS {formatClock(track.lastGpsAt)} · consulta{" "}
              {formatClock(track.lastCheckAt)}
            </p>
          ) : null}
          <p className={cn("mt-2 text-4xl font-medium tabular-nums tracking-tight", distanceClass)}>
            {track ? formatDistance(track.lastDistanceM) : "—"}
          </p>
          <p className="mt-2 text-sm leading-5 text-[#4B5563] dark:text-white/60">
            {track ? reading(track) : "Carregando a ocorrência…"}
          </p>
          {error ? <p className="mt-3 text-sm text-[#B42318] dark:text-red-300">{error}</p> : null}
        </div>

        {track ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
            <PersonCard
              label="Vítima"
              name={track.victim.name}
              phone={track.victim.phone}
              point={track.victim.location}
              goLabel="Ir até a vítima"
            />
            <PersonCard
              label="Preso"
              name={track.inmate.name}
              phone={track.inmate.phone}
              point={track.inmate.location}
              goLabel="Ir até o preso"
            />

            <section className="shrink-0 bg-[#F4F6F8] px-3 py-3 text-[12px] dark:bg-white/6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#6B7280] dark:text-white/45">Raio da violação</span>
                <span className="tabular-nums">{formatDistance(track.radiusMeters)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[#6B7280] dark:text-white/45">Raio de atenção</span>
                <span className="tabular-nums">{formatDistance(track.watchRadiusMeters)}</span>
              </div>
            </section>
{/* deixar comentado por hora */}
            {/* {openAlert ? (
              <section className="bg-[#F4F6F8] px-3 py-3 dark:bg-white/6">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">Alerta aberto</p>
                  <Link
                    href={`/alerts/${openAlert}`}
                    className="text-[11px] text-[#1B2A41] underline-offset-4 hover:underline dark:text-white/70"
                  >
                    Ver alerta
                  </Link>
                </div>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Motivo, se quiser registrar"
                  className="mt-3 w-full border border-[#D8DEE6] bg-white px-2.5 py-2 text-sm text-[#1B2A41] outline-none placeholder:text-[#9CA3AF] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void resolveAlert("RESOLVED")}
                    className="bg-[#1B2A41] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#24364f] disabled:opacity-60 dark:bg-white dark:text-[#262626] dark:hover:bg-[#E8E8E8]"
                  >
                    Encerrar alerta
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void resolveAlert("FALSE_POSITIVE")}
                    className="px-2.5 py-1.5 text-xs text-[#4B5563] hover:text-[#1B2A41] disabled:opacity-60 dark:text-white/55 dark:hover:text-white"
                  >
                    Falso positivo
                  </button>
                </div>
                {actionError ? (
                  <p className="mt-2 text-xs text-[#B42318] dark:text-red-300">{actionError}</p>
                ) : null}
              </section>
            ) : null} */}

            <section className="flex min-h-0 flex-1 flex-col bg-[#F4F6F8] px-3 py-3 dark:bg-white/6">
              <p className="shrink-0 text-[10px] tracking-[0.14em] text-[#6B7280] uppercase dark:text-white/35">
                Posições
              </p>
              {lines.length === 0 ? (
                <p className="mt-1.5 text-sm leading-5 text-[#4B5563] dark:text-white/60">
                  As posições aparecem aqui conforme o preso ou a vítima se desloca.
                </p>
              ) : (
                <div ref={linesRef} className="relative mt-3 min-h-0 flex-1 overflow-y-auto">
                  {lines.map((line, index) => {
                    const tone = lineTone(line.zone);
                    return (
                      <div
                        key={line.id}
                        data-line-id={line.id}
                        className="relative pb-4 pl-5 last:pb-1"
                      >
                        {index < lines.length - 1 ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-3 bottom-[-2px] left-[4px] w-px",
                              tone.stem,
                            )}
                          />
                        ) : null}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-1 left-0 size-2.5 rounded-full",
                            tone.dot,
                            line.id === freshId && cn("ring-2 ring-offset-1", tone.ring),
                          )}
                        />
                        <p
                          className={cn(
                            "text-justify text-sm leading-5",
                            line.id === freshId && "text-[#B45309] dark:text-[#E8C98A]",
                          )}
                        >
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function PersonCard({
  label,
  name,
  phone,
  point,
  goLabel,
}: {
  label: string;
  name: string;
  phone: string | null;
  point: OperationsPoint | null;
  goLabel: string;
}) {
  const trimmed = phone?.trim() ?? "";
  const seenAt = formatClock(point?.recordedAt);

  return (
    <section className="shrink-0 bg-[#F4F6F8] px-3 py-3 dark:bg-white/6">
      <p className="truncate text-sm text-[#1B2A41] dark:text-white">
        {name}
        <span className="ml-2 text-[10px] tracking-[0.14em] text-[#6B7280] uppercase dark:text-white/35">
          {label}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {trimmed ? (
          <a
            href={telHref(trimmed)}
            className="inline-flex items-center gap-1 text-[#1B2A41] underline-offset-4 hover:underline dark:text-white/80"
          >
            <Phone className="size-3.5" />
            Ligar
          </a>
        ) : null}
        {trimmed ? (
          <a
            href={whatsappHref(trimmed)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#1B2A41] underline-offset-4 hover:underline dark:text-white/80"
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp
          </a>
        ) : null}
        {point ? (
          <a
            href={directionsHref(point)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#1B2A41] underline-offset-4 hover:underline dark:text-white/80"
          >
            <MapPin className="size-3.5" />
            {goLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, MapPin, Menu, Phone } from "lucide-react";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { useOpenMapMenu } from "@/components/layout/map-chrome";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { geofenceConfig } from "@/config/geofence";
import type { OperationsPoint, OperationsTrack } from "@/types/operations";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const OperationsMap = dynamic(
  () =>
    import("@/components/operations/operations-map").then(
      (mod) => mod.OperationsMap,
    ),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#E8EAED]" /> },
);

type BoardResponse = {
  tracks: OperationsTrack[];
  signals?: OperationsTrack[];
  violatingCount: number;
  watchCount: number;
  monitoredCount: number;
  silentCount?: number;
  clearCount?: number;
};

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

function formatDistance(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function useMapPadding() {
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return wide
    ? {
      topLeft: [24, 88] as [number, number],
      bottomRight: [380, 36] as [number, number],
    }
    : {
      topLeft: [16, 84] as [number, number],
      bottomRight: [16, 250] as [number, number],
    };
}

export function OperationsBoard() {
  const { authData } = useAuth();
  const user = authData.user;
  const openMenu = useOpenMapMenu();
  const mapPadding = useMapPadding();
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listMode, setListMode] = useState<"violation" | "watch" | "silent">(
    "violation",
  );
  const [focus, setFocus] = useState<{ id: string; tick: number } | null>(null);
  const [freshViolations, setFreshViolations] = useState<OperationsTrack[]>([]);
  const knownViolations = useRef<Set<string> | null>(null);
  const clock = useClock();
  const refreshMs = geofenceConfig.intervals.liveSeconds * 1000;

  useEffect(() => {
    document.title = "Ampara - Acompanhamento Geral";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/operations/board", {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as BoardResponse & {
          message?: string;
        };
        if (!res.ok) {
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "Não foi possível carregar o painel",
          );
        }
        if (cancelled) return;

        const violations = data.tracks.filter((track) => track.zone === "violation");
        const incoming = new Set(violations.map((track) => track.orderId));
        if (knownViolations.current) {
          const fresh = violations.filter(
            (track) => !knownViolations.current?.has(track.orderId),
          );
          if (fresh.length > 0) {
            setFreshViolations((current) => {
              const seen = new Set(current.map((track) => track.orderId));
              return [...fresh.filter((track) => !seen.has(track.orderId)), ...current];
            });
          }
        }
        knownViolations.current = incoming;
        setBoard(data);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar o painel");
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshMs]);

  const tracks = board?.tracks ?? [];
  const violations = useMemo(
    () => tracks.filter((track) => track.zone === "violation"),
    [tracks],
  );
  const watching = useMemo(
    () => tracks.filter((track) => track.zone === "watch"),
    [tracks],
  );
  const silent = board?.signals ?? [];
  const violationCount = board?.violatingCount ?? 0;
  const watchCount = board?.watchCount ?? 0;
  const silentCount = board?.silentCount ?? silent.length;
  const monitoredCount = board?.monitoredCount ?? 0;
  const followedMode =
    listMode === "violation" && violationCount === 0 && watchCount > 0
      ? "watch"
      : listMode === "watch" && watchCount === 0 && violationCount > 0
        ? "violation"
        : listMode === "silent" && silentCount === 0 && violationCount > 0
          ? "violation"
          : listMode;
  const selectedMode =
    followedMode === "violation" && violationCount > 0
      ? "violation"
      : followedMode === "watch" && watchCount > 0
        ? "watch"
        : followedMode === "silent" && silentCount > 0
          ? "silent"
          : violationCount > 0
            ? "violation"
            : watchCount > 0
              ? "watch"
              : silentCount > 0
                ? "silent"
                : null;

  useEffect(() => {
    if (followedMode !== listMode) setListMode(followedMode);
  }, [followedMode, listMode]);

  function focusTrack(orderId: string) {
    const track = tracks.find((item) => item.orderId === orderId);
    if (track?.zone === "violation" || track?.zone === "watch") {
      setListMode(track.zone);
    }
    setFocus((current) => ({
      id: orderId,
      tick: (current?.tick ?? 0) + 1,
    }));
  }

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#E8EAED] dark:bg-[#262626]">
      <div className="absolute inset-0 z-0">
        <OperationsMap
          tracks={tracks.filter((track) => track.zone !== "clear")}
          focusOrderId={focus?.id ?? null}
          focusTick={focus?.tick ?? 0}
          padding={mapPadding}
          onSelect={focusTrack}
          onOpen={(orderId) => {
            window.open(
              `/acompanhamento/${orderId}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        />
      </div>

      <div className="pointer-events-none absolute top-0 left-0 z-[500] px-5 pt-3">
        <div className="p-1">
          <PoliciaPenalMark size={56} className="size-20" />
        </div>
      </div>

      {user ? (
        <div className="absolute top-4 right-4 z-[500] flex items-center gap-2 md:right-[364px]">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={openMenu}
            className="grid size-11 cursor-pointer place-items-center rounded-lg bg-white text-[#1B2A41] shadow-md ring-1 ring-[#D8DEE6] hover:bg-[#F4F6F8] dark:bg-[#262626] dark:text-white dark:ring-white/15 dark:hover:bg-[#303030]"
          >
            <Menu className="size-5" />
          </button>
        </div>
      ) : null}

      {freshViolations.length > 0 ? (
        <div className="absolute top-20 left-3 z-[500] max-w-sm bg-[#C62828] px-3 py-2 text-xs text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              {freshViolations.length === 1
                ? "Nova violação"
                : `${freshViolations.length} novas violações`}
            </p>
            <button
              type="button"
              onClick={() => setFreshViolations([])}
              className="font-medium underline-offset-2 hover:underline"
            >
              Fechar
            </button>
          </div>
          <ul className="mt-1 space-y-0.5">
            {freshViolations.slice(0, 4).map((track) => (
              <li key={track.orderId}>
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => focusTrack(track.orderId)}
                >
                  {track.inmate.name} · {track.victim.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-14 z-[500] flex gap-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] text-[#1B2A41] shadow-md ring-1 ring-[#D8DEE6] backdrop-blur-sm dark:bg-[#262626]/90 dark:text-slate-200 dark:ring-white/10">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#D97706]" />
          Em atenção
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#C62828]" />
          Em violação
        </span>
      </div>

      <aside className="absolute inset-x-3 bottom-3 z-[500] flex max-h-[42vh] flex-col rounded-lg bg-white/95 text-[#1B2A41] ring-1 ring-[#D8DEE6] backdrop-blur-sm md:inset-x-auto md:top-4 md:right-3 md:bottom-3 md:w-[340px] md:max-h-none dark:bg-[#262626]/95 dark:text-white dark:ring-white/12">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-sm font-medium">Acompanhamento Geral</h1>
          <p className="mt-1.5 flex items-baseline justify-between text-xs text-[#6B7280] dark:text-white/45">
            <span>
              <span className="tabular-nums text-[#1B2A41] dark:text-white">
                {monitoredCount}
              </span>{" "}
              {monitoredCount === 1 ? "ativa" : "ativas"}
            </span>
            <span className="font-mono tabular-nums">{clock}</span>
          </p>
        </div>
        <div className="grid grid-cols-3 border-b border-[#E5E7EB] dark:border-white/10">
          <ListModeButton
            count={watchCount}
            label="Atenção"
            tone="watch"
            selected={selectedMode === "watch"}
            onClick={() => setListMode("watch")}
          />
          <ListModeButton
            count={violationCount}
            label="Violação"
            tone="violation"
            selected={selectedMode === "violation"}
            onClick={() => setListMode("violation")}
          />
          <ListModeButton
            count={silentCount}
            label="Sem sinal"
            tone="silent"
            selected={selectedMode === "silent"}
            onClick={() => setListMode("silent")}
          />
        </div>

        {error ? (
          <p className="px-4 py-3 text-sm text-[#B42318] dark:text-red-300">{error}</p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedMode == null ? (
            <div className="px-4 py-6">
              <p className="text-sm text-[#4B5563] dark:text-slate-300">
                {monitoredCount === 0
                  ? "Nenhuma medida ativa para acompanhar."
                  : "Nenhuma aproximação neste momento."}
              </p>
            </div>
          ) : (
            <CaseList
              tone={selectedMode}
              tracks={
                selectedMode === "violation"
                  ? violations
                  : selectedMode === "watch"
                    ? watching
                    : silent
              }
              selectedId={focus?.id ?? null}
              onFocus={focusTrack}
              empty={
                selectedMode === "violation"
                  ? "Nenhuma violação no momento."
                  : selectedMode === "watch"
                    ? "Nenhum caso em atenção."
                    : "Nenhum aparelho sem sinal."
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function ListModeButton({
  count,
  label,
  tone,
  selected,
  onClick,
}: {
  count: number;
  label: string;
  tone: "violation" | "watch" | "silent";
  selected: boolean;
  onClick: () => void;
}) {
  const active = count > 0;
  return (
    <button
      type="button"
      disabled={!active}
      aria-pressed={selected && active}
      onClick={onClick}
      className={cn(
        "py-2.5 text-sm",
        active ? "cursor-pointer" : "cursor-not-allowed",
        tone === "watch" &&
        "bg-[#F8E7C8] text-[#7A5314] hover:bg-[#F3DDB4] dark:bg-[#3E301C] dark:text-[#E8D0A8] dark:hover:bg-[#4A3A22]",
        tone === "watch" &&
        selected &&
        "bg-[#E2A84A] text-[#3F2A08] hover:bg-[#D89B38] dark:bg-[#8C6428] dark:text-[#FFF4E0] dark:hover:bg-[#7C5822]",
        tone === "violation" &&
        "bg-[#F8D5D5] text-[#8A3030] hover:bg-[#F3C6C6] dark:bg-[#3E2222] dark:text-[#E8C4C4] dark:hover:bg-[#4A2A2A]",
        tone === "violation" &&
        selected &&
        "bg-[#D46A6A] text-[#3A1212] hover:bg-[#C85E5E] dark:bg-[#8A3C3C] dark:text-[#FFF0F0] dark:hover:bg-[#7A3434]",
        tone === "silent" &&
        "bg-[#E5E7EB] text-[#374151] hover:bg-[#D8DEE6] dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
        tone === "silent" &&
        selected &&
        "bg-[#9CA3AF] text-[#111827] hover:bg-[#6B7280] dark:bg-white/25 dark:text-white",
      )}
    >
      <span className="inline-flex items-baseline justify-center gap-2">
        {label}
        <span className="tabular-nums">{count}</span>
      </span>
    </button>
  );
}

function CaseList({
  tone,
  tracks,
  selectedId,
  onFocus,
  empty,
}: {
  tone: "violation" | "watch" | "silent";
  tracks: OperationsTrack[];
  selectedId: string | null;
  onFocus: (orderId: string) => void;
  empty: string;
}) {
  if (tracks.length === 0) {
    return <p className="px-4 py-6 text-sm text-[#6B7280] dark:text-slate-400">{empty}</p>;
  }

  const bar =
    tone === "violation"
      ? "bg-[#C62828]"
      : tone === "watch"
        ? "bg-[#D97706]"
        : "bg-[#6B7280]";
  const distance =
    tone === "violation"
      ? "text-[#C62828] dark:text-red-200"
      : tone === "watch"
        ? "text-[#B45309] dark:text-amber-200"
        : "text-[#374151] dark:text-white/80";

  return (
    <section className="flex flex-col">
      {tracks.map((track, index) => {
        const selected = track.orderId === selectedId;
        return (
          <article
            key={track.orderId}
            onClick={() => onFocus(track.orderId)}
            className={cn(
              "relative cursor-pointer border-b border-[#D0D5DC] px-3 py-3 dark:border-white/20",
              index > 0 && "border-t",
              selected && "bg-[#F7F8FA] dark:bg-white/4",
            )}
          >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", bar)} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-2xl font-medium tabular-nums tracking-tight", distance)}>
                  {formatDistance(track.lastDistanceM)}
                </p>
                <p className="mt-0.5 text-xs text-[#4B5563] dark:text-white/55">
                  {marginLabel(track)}
                </p>
              </div>
              <Link
                href={`/acompanhamento/${track.orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Acompanhar caso"
                title="Acompanhar caso"
                onClick={(event) => event.stopPropagation()}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1B2A41] text-white hover:bg-[#24364f] dark:bg-white dark:text-[#262626] dark:hover:bg-[#E8E8E8]"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-3 grid gap-4">
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
            </div>
            <p className="mt-3 text-[11px] text-[#6B7280] dark:text-white/45">
              {signalLabel(track)}
              {" · "}
              contato {formatClock(track.lastContactAt)}
              {" · "}
              GPS {formatClock(track.lastGpsAt)}
              {" · "}
              consulta {formatClock(track.lastCheckAt)}
            </p>
            <p className="mt-1 text-[11px] text-[#6B7280] dark:text-white/45">
              Raio da violação{" "}
              <span className="tabular-nums text-[#1B2A41] dark:text-white/80">
                {formatDistance(track.radiusMeters)}
              </span>
              <span className="mx-1.5 text-[#D8DEE6] dark:text-white/20">·</span>
              Raio de atenção{" "}
              <span className="tabular-nums text-[#1B2A41] dark:text-white/80">
                {formatDistance(track.watchRadiusMeters)}
              </span>
            </p>
          </article>
        );
      })}
    </section>
  );
}

function formatClock(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function signalLabel(track: OperationsTrack) {
  if (track.signal === "no_signal") return "Sem comunicação";
  if (track.signal === "stale_gps") return "GPS desatualizado";
  if (track.signal === "no_background") return "Sem segundo plano";
  if (!track.distanceFresh) return "Distância não confirmada";
  return "Acompanhamento em dia";
}

function marginLabel(track: OperationsTrack) {
  if (track.signal === "no_signal") return "O aparelho parou de chamar";
  if (track.signal === "stale_gps") return "A API responde, o GPS não";
  if (track.signal === "no_background") return "Permissão de segundo plano negada";
  if (track.lastDistanceM == null) return "Sem posição recente do preso";
  const distance = Math.round(track.lastDistanceM);
  if (track.zone === "violation") {
    const inside = Math.max(0, Math.round(track.radiusMeters - distance));
    return `${inside} m dentro do raio`;
  }
  const until = Math.max(0, Math.round(distance - track.radiusMeters));
  return `${until} m até a violação`;
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

  return (
    <section className="min-w-0">
      <p className="truncate text-sm text-[#1B2A41] dark:text-white">
        {name}
        <span className="ml-2 text-[10px] tracking-[0.14em] text-[#6B7280] uppercase dark:text-white/35">
          {label}
        </span>
      </p>
      {trimmed || point ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {trimmed ? (
            <a
              href={telHref(trimmed)}
              onClick={(event) => event.stopPropagation()}
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
              onClick={(event) => event.stopPropagation()}
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
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 text-[#1B2A41] underline-offset-4 hover:underline dark:text-white/80"
            >
              <MapPin className="size-3.5" />
              {goLabel}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

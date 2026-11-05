"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Download, Minus, Pause, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadTrackingReport } from "@/lib/tracking-report-pdf";
import { cn } from "@/lib/utils";

const TrackingMap = dynamic(
  () =>
    import("@/components/tracking/tracking-map").then((mod) => mod.TrackingMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#E8EAED]" /> },
);

type Zone = "WATCH" | "VIOLATION" | "OUTSIDE";

type DetailResponse = {
  from: string;
  to: string;
  order: {
    id: string;
    judicialRef: string | null;
    victimName: string;
    inmateName: string;
    radiusMeters: number;
    watchRadiusMeters: number;
  } | null;
  points: Array<{
    id: string;
    zone: Zone;
    victim: { latitude: number; longitude: number };
    inmate: { latitude: number; longitude: number };
  }>;
  narrative: Array<{
    id: string;
    kind: "point" | "still";
    recordedAt: string;
    zone: Zone | null;
    text: string;
    victim: { latitude: number; longitude: number } | null;
    inmate: { latitude: number; longitude: number } | null;
  }>;
};

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function situationBar(zone: Zone | null) {
  if (zone === "VIOLATION") return "bg-[#C62828]";
  if (zone === "OUTSIDE") return "bg-[#2E7D32]";
  if (zone === "WATCH") return "bg-[#D97706]";
  return "bg-[#E2E5EA]";
}

const SPEEDS = [0.5, 1, 2, 4] as const;

function speedLabel(speed: number) {
  return `${String(speed).replace(".", ",")}×`;
}

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function TrackingDetail({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const q = searchParams.get("q") ?? "";
  const origem = searchParams.get("origem");
  const entrada = searchParams.get("entrada");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const points = data?.points ?? [];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      try {
        const response = await fetch(
          `/api/v1/tracking/${orderId}?${params.toString()}`,
          { credentials: "include" },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof body.message === "string"
              ? body.message
              : "Não foi possível abrir o percurso",
          );
        }
        if (!cancelled) {
          const detail = body as DetailResponse;
          const startId =
            entrada && detail.points.some((point) => point.id === entrada)
              ? entrada
              : null;
          setData(detail);
          setSelectedId(startId ?? detail.points.at(-1)?.id ?? null);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha ao abrir o percurso",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, from, to, entrada]);

  useEffect(() => {
    if (!entrada || !data || playing) return;
    document
      .getElementById(`narrativa-${entrada}`)
      ?.scrollIntoView({ block: "center" });
  }, [entrada, data, playing]);

  useEffect(() => {
    if (!playing || !selectedId) return;
    document
      .getElementById(`narrativa-${selectedId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [playing, selectedId]);

  function togglePlay() {
    if (points.length === 0) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    const index = points.findIndex((point) => point.id === selectedId);
    if (index < 0 || index >= points.length - 1) {
      setSelectedId(points[0].id);
    }
    setPlaying(true);
  }

  async function downloadReport() {
    if (!data?.order || points.length === 0 || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadTrackingReport({
        from: data.from,
        to: data.to,
        order: data.order,
        narrative: data.narrative,
      });
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error
          ? downloadFailure.message
          : "Não foi possível baixar o relatório",
      );
    } finally {
      setDownloading(false);
    }
  }

  function changeSpeed(direction: -1 | 1) {
    setSpeed((current) => {
      const index = SPEEDS.indexOf(current);
      const next = SPEEDS[index + direction];
      return next ?? current;
    });
  }

  const backQuery = new URLSearchParams();
  const livroDay = searchParams.get("day") ?? searchParams.get("livroFrom");
  if (origem === "livro") {
    if (livroDay) backQuery.set("day", livroDay);
  } else {
    if (from) backQuery.set("from", from);
    if (to) backQuery.set("to", to);
  }
  if (q) backQuery.set("q", q);
  const backHref =
    origem === "livro"
      ? `/ocorrencias?${backQuery.toString()}${entrada ? `#${entrada}` : ""}`
      : `/relatorios?${backQuery.toString()}`;
  const backLabel = origem === "livro" ? "Ocorrências" : "Relatórios";

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#1B2A41]"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-[#1B2A41]">
            {data?.order?.inmateName ?? "Percurso"}
          </h1>
          <p className="text-sm text-[#4B5563]">
            {data?.order
              ? `Vítima: ${data.order.victimName}${data.order.judicialRef ? ` · ${data.order.judicialRef}` : ""}`
              : "Carregando…"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={!data?.order || points.length === 0 || downloading}
          onClick={() => void downloadReport()}
        >
          <Download className="size-4" />
          {downloading ? "Gerando…" : "Baixar relatório"}
        </Button>
      </div>

      {error ? <p className="text-sm text-[#C62828]">{error}</p> : null}
      {downloadError ? <p className="text-sm text-[#C62828]">{downloadError}</p> : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="relative min-h-[280px] overflow-hidden border border-[#D8DEE6] bg-white">
          <TrackingMap
            points={points}
            selectedId={selectedId}
            playing={playing}
            speed={speed}
            onCheckpoint={setSelectedId}
            onPlaybackEnd={() => setPlaying(false)}
          />
          <div className="map-keep pointer-events-auto absolute bottom-3 left-3 z-[1000] flex items-center gap-1 rounded-full border border-slate-400 bg-slate-200 p-1 shadow-[0_8px_22px_rgba(0,0,0,0.22)] dark:border-white/40 dark:bg-[#8A8A8A] dark:shadow-[0_8px_22px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              aria-label={playing ? "Pausar percurso" : "Reproduzir percurso"}
              disabled={points.length === 0}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#B45309] text-white disabled:cursor-default disabled:opacity-40 dark:bg-[#E8C98A] dark:text-[#262626]"
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
            </button>
            <button
              type="button"
              aria-label="Diminuir velocidade"
              disabled={speed === SPEEDS[0]}
              className="grid size-9 cursor-pointer place-items-center rounded-full text-[#1A1A1A] hover:bg-black/10 disabled:cursor-default disabled:opacity-40"
              onClick={() => changeSpeed(-1)}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-10 text-center text-xs font-semibold tabular-nums text-[#1A1A1A]">
              {speedLabel(speed)}
            </span>
            <button
              type="button"
              aria-label="Aumentar velocidade"
              disabled={speed === SPEEDS[SPEEDS.length - 1]}
              className="grid size-9 cursor-pointer place-items-center rounded-full text-[#1A1A1A] hover:bg-black/10 disabled:cursor-default disabled:opacity-40"
              onClick={() => changeSpeed(1)}
            >
              <Plus className="size-4" />
            </button>
          </div>
        </section>
        <aside className="flex min-h-0 flex-col overflow-hidden border border-[#D8DEE6] bg-white">
          <div className="border-b border-[#E2E5EA] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1B2A41]">Descrição</h2>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Clique em um momento para vê-lo no mapa.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {data?.narrative.map((item, index) => {
              const showDay =
                index === 0 ||
                dayKey(item.recordedAt) !==
                  dayKey(data.narrative[index - 1].recordedAt);
              const active = item.kind === "point" && item.id === selectedId;
              return (
                <div key={item.id} id={item.kind === "point" ? `narrativa-${item.id}` : undefined}>
                  {showDay ? (
                    <p className="bg-[#F7F8FA] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      {dayLabel(item.recordedAt)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={item.kind !== "point"}
                    onClick={() => {
                      if (item.kind !== "point") return;
                      setPlaying(false);
                      setSelectedId(item.id);
                    }}
                    className={cn(
                      "flex w-full border-b border-[#F0F2F5] text-left",
                      item.kind === "still" && "bg-[#FAFBFC]",
                      item.kind === "point" && !active && "hover:bg-[#F7F8FA]",
                    )}
                  >
                    <span
                      className={cn("w-1.5 shrink-0", situationBar(item.zone))}
                      aria-hidden
                    />
                    <p
                      className={cn(
                        "px-4 py-3 text-sm leading-5 text-[#1B2A41]",
                        item.kind === "still" && "text-[#6B7280]",
                        active && "text-[#B45309] dark:text-[#E8C98A]",
                      )}
                    >
                      {item.text}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

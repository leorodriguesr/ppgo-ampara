"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Info, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/layout/page-loading";
import {
  ListSearch,
  ListSearchField,
  ListSearchSubmit,
  SearchDateField,
} from "@/components/layout/list-search";
import { calendarDay, currentWorkDay } from "@/lib/work-day";
import { cn } from "@/lib/utils";

type Cause = "inmate" | "victim" | "both" | "unclear";

type DiaryEntry = {
  entryPointId: string;
  orderId: string;
  judicialRef: string | null;
  victimName: string;
  inmateName: string;
  startedAt: string;
  endedAt: string;
  ongoing: boolean;
  minDistanceMeters: number;
  cause: Cause;
  text: string;
  ruling: "COUNTS" | "VICTIM_APPROACH" | "DISMISSED" | null;
  actions: string | null;
  finalized: boolean;
  finalizedAt: string | null;
  counts: boolean;
  pending: boolean;
  bothMoved: boolean;
};

const APPROACH_VALUE: Record<Cause, string> = {
  inmate: "Só o preso",
  victim: "Só a vítima",
  both: "Preso e vítima",
  unclear: "Não identificado",
};


function formatMeters(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function saoPauloParts(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return { day, time };
}

function momentLabel(value: string) {
  const { day, time } = saoPauloParts(value);
  return `${day} · ${time}`;
}

function narrativeBody(text: string) {
  const body = text.replace(/^\d{2}:\d{2}\s+—\s+/, "");
  if (!body) return text;
  return body.charAt(0).toUpperCase() + body.slice(1);
}

/** Badge indica se a ocorrência já foi concluída. Anotações não finalizam. */
function statusLabel(entry: DiaryEntry) {
  return entry.finalized ? "Concluído" : "A concluir";
}

function cardAccent(entry: DiaryEntry) {
  if (!entry.finalized) {
    return {
      emphasis: "text-[#B45309] dark:text-amber-200",
      bar: "bg-[#D97706]",
      badge: "bg-[#D97706]/10 dark:bg-[#D97706]/20",
    };
  }
  return {
    emphasis: "text-[#15803D] dark:text-emerald-300",
    bar: "bg-[#15803D]",
    badge: "bg-[#15803D]/10 dark:bg-[#15803D]/20",
  };
}

export function LivroDeOcorrencias() {
  const searchParams = useSearchParams();
  const today = currentWorkDay();
  const initialDay =
    searchParams.get("day") || searchParams.get("from") || today;
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [day, setDay] = useState(initialDay);
  const [applied, setApplied] = useState({
    q: initialQ,
    day: initialDay,
  });
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!helpOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!helpRef.current?.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setHelpOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [helpOpen]);

  const load = useCallback(async (params: { q: string; day: string }) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ day: params.day });
      if (params.q.trim()) query.set("q", params.q.trim());
      const response = await fetch(`/api/v1/diario?${query.toString()}`, {
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.message === "string"
            ? body.message
            : "Falha ao carregar o diário",
        );
      }
      setEntries(Array.isArray(body.entries) ? body.entries : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Falha ao carregar o diário",
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  useEffect(() => {
    if (loading || entries.length === 0) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, [loading, entries]);

  async function save(entry: DiaryEntry, finalize: boolean) {
    const actions = (drafts[entry.entryPointId] ?? entry.actions ?? "").trim();
    if (finalize && (entry.ongoing || !actions)) return;
    setSavingId(entry.entryPointId);
    setError(null);
    try {
      const response = await fetch("/api/v1/diario", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryPointId: entry.entryPointId,
          actions: actions || null,
          finalize,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.message === "string"
            ? body.message
            : "Não foi possível salvar as ações",
        );
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.entryPointId];
        return next;
      });
      setEditingId((current) => (current === entry.entryPointId ? null : current));
      await load(applied);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar as ações",
      );
    } finally {
      setSavingId(null);
    }
  }

  if (!ready) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div ref={helpRef} className="relative flex w-fit items-center gap-1">
        <h1 data-tone="bronze" className="ampara-title text-lg font-semibold text-[#1B2A41]">Ocorrências</h1>
        <button
          type="button"
          aria-label="Sobre as ocorrências"
          aria-expanded={helpOpen}
          className="grid size-7 place-items-center rounded-full text-[#6B7280] hover:bg-[#F4F6F8] hover:text-[#1B2A41]"
          onClick={() => setHelpOpen((open) => !open)}
        >
          <Info className="size-4" />
        </button>
        {helpOpen ? (
          <div
            role="dialog"
            aria-label="Sobre as ocorrências"
            className="absolute top-full left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[#D8DEE6] bg-card p-3 text-xs leading-5 text-[#4B5563] shadow-lg"
          >
            A equipe policial registra aqui as ações de cada violação da
            medida protetiva. O dia acompanha o plantão, das 08h às 08h do dia
            seguinte. Se a violação passar desse horário, a mesma ocorrência
            segue com a equipe que assume. O andamento pode ser anotado a
            qualquer momento; concluir, só quando ela terminar.
          </div>
        ) : null}
      </div>

      <ListSearch
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ q, day });
        }}
      >
        <ListSearchField
          value={q}
          onChange={setQ}
          placeholder="Preso ou vítima"
          label="Preso ou vítima"
        />
        <SearchDateField value={day} onChange={setDay} label="Dia" />
        <ListSearchSubmit />
      </ListSearch>

      {error ? <p className="text-sm text-[#C62828]">{error}</p> : null}

      {loading ? (
        <p className="rounded-lg border border-[#D8DEE6] bg-card px-4 py-8 text-sm text-[#6B7280] shadow-sm">
          Carregando…
        </p>
      ) : null}
      {!loading && entries.length === 0 ? (
        <p className="rounded-lg border border-[#D8DEE6] bg-card px-4 py-8 text-sm text-[#4B5563] shadow-sm">
          Nenhuma violação neste dia.
        </p>
      ) : null}
      {!loading && entries.length > 0 ? (
        <ul className="flex flex-col gap-5">
          {entries.map((entry) => {
            const actions = drafts[entry.entryPointId] ?? entry.actions ?? "";
            const savedActions = entry.actions?.trim() ?? "";
            const editingActions =
              !entry.finalized || editingId === entry.entryPointId;
            const busy = savingId === entry.entryPointId;
            const accent = cardAccent(entry);
            const percursoHref = `/relatorios/${entry.orderId}?${new URLSearchParams({
              from: calendarDay(new Date(entry.startedAt)),
              to: calendarDay(new Date(entry.endedAt)),
              origem: "livro",
              entrada: entry.entryPointId,
              day: applied.day,
              ...(applied.q.trim() ? { q: applied.q.trim() } : {}),
            }).toString()}`;
            return (
              <li
                key={entry.entryPointId}
                id={entry.entryPointId}
                className="overflow-hidden rounded-xl border border-[#D8DEE6] bg-card shadow-sm"
              >
                <div className="flex">
                  <div className={cn("w-1 shrink-0 self-stretch", accent.bar)} />
                  <div className="min-w-0 flex-1">
                    <div className="relative px-4 pt-4 pb-3">
                      <span
                        className={cn(
                          "absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                          accent.emphasis,
                          accent.badge,
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", accent.bar)} />
                        {statusLabel(entry)}
                      </span>
                      <div className="grid gap-4 pr-28 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Preso
                          </p>
                          <p className="mt-1 text-base font-semibold text-[#1B2A41]">
                            {entry.inmateName}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Vítima
                          </p>
                          <p className="mt-1 text-base font-semibold text-[#1B2A41]">
                            {entry.victimName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-[#F0F2F5] px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Início
                          </p>
                          <p className="mt-1 text-sm whitespace-nowrap text-[#1B2A41] tabular-nums">
                            {momentLabel(entry.startedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Fim
                          </p>
                          {entry.ongoing ? (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#C62828]">
                              <span className="size-1.5 rounded-full bg-[#C62828]" />
                              Ainda em violação
                            </p>
                          ) : (
                            <p className="mt-1 text-sm whitespace-nowrap text-[#1B2A41] tabular-nums">
                              {momentLabel(entry.endedAt)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Menor distância
                          </p>
                          <p className="mt-1 text-sm text-[#1B2A41] tabular-nums">
                            {formatMeters(entry.minDistanceMeters)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
                            Quem se aproximou
                          </p>
                          <p className="mt-1 text-sm text-[#1B2A41]">
                            {APPROACH_VALUE[entry.cause]}
                          </p>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col border-l border-[#F0F2F5] pl-4">
                        <p className="text-justify text-sm leading-5 text-[#4B5563]">
                          {narrativeBody(entry.text)}
                        </p>
                        <Link
                          href={percursoHref}
                          className="mt-3 inline-flex items-center gap-1 self-end text-xs font-medium text-[#1B2A41] underline-offset-2 hover:underline"
                        >
                          Ver percurso
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Rodapé: ações tomadas (sempre visível) */}
                    <div className="border-t border-[#F0F2F5] px-4 py-3">
                      {!editingActions ? (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#6B7280] uppercase">
                              Ações tomadas
                            </p>
                            {savedActions ? (
                              <p className="mt-1 text-sm leading-5 whitespace-pre-wrap text-[#1B2A41]">
                                {savedActions}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-[#9CA3AF] italic">
                                Nenhuma ação registrada ainda.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label="Editar ações tomadas"
                            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-[#F4F6F8] text-[#4B5563] hover:bg-[#E8EAED] hover:text-[#1B2A41]"
                            onClick={() => setEditingId(entry.entryPointId)}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#6B7280] uppercase">
                            Ações tomadas
                          </p>
                          <div className="mt-1.5 flex items-end gap-2">
                            <textarea
                              value={actions}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [entry.entryPointId]: event.target.value,
                                }))
                              }
                              rows={3}
                              maxLength={2000}
                              placeholder="O que foi feito nesta ocorrência"
                              className="min-w-0 flex-1 rounded-lg border border-[#D8DEE6] bg-white px-3 py-2.5 text-sm text-[#1B2A41] outline-none"
                            />
                            <div className="flex shrink-0 flex-col gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void save(entry, false)}
                                className="cursor-pointer"
                              >
                                Salvar
                              </Button>
                              {!entry.finalized && !entry.ongoing ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={busy || !actions.trim()}
                                  onClick={() => void save(entry, true)}
                                  className="cursor-pointer"
                                >
                                  Concluir
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {entry.ongoing && !entry.finalized ? (
                            <p className="mt-2 text-xs text-[#6B7280]">
                              Ainda em violação: você pode anotar o andamento,
                              mas só poderá concluir quando ela terminar.
                            </p>
                          ) : null}
                          {!entry.finalized && !entry.ongoing && !actions.trim() ? (
                            <p className="mt-2 text-xs text-[#6B7280]">
                              Preencha as ações tomadas para concluir.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

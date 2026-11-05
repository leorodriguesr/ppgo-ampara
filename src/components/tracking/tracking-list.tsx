"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { RowDeleteButton } from "@/components/layout/row-delete-button";
import { PageLoading } from "@/components/layout/page-loading";
import {
  ListSearch,
  ListSearchField,
  ListSearchSubmit,
  SearchDateRangeField,
} from "@/components/layout/list-search";
import { buttonVariants } from "@/components/ui/button";
import { formatDay as formatCalendarDay, formatPersonName } from "@/lib/format";
import { cn } from "@/lib/utils";

type ReportRow = {
  orderId: string;
  judicialRef: string | null;
  victimName: string;
  inmateName: string;
  pointCount: number;
  firstAt: string;
  lastAt: string;
  minDistanceMeters: number;
  hadViolation: boolean;
  violationCount: number;
  pendingViolations: number;
};

type ReportResponse = {
  from: string;
  to: string;
  movementMeters: number;
  reports: ReportRow[];
};

function todayInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMeters(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDay(day: string) {
  const [year, month, date] = day.split("-");
  if (!year || !month || !date) return day;
  return `${date}/${month}/${year}`;
}

export function TrackingList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = todayInput();
  const initialFrom = searchParams.get("from") || today;
  const initialTo = searchParams.get("to") || initialFrom;
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [applied, setApplied] = useState({
    q: initialQ,
    from: initialFrom,
    to: initialTo,
  });
  const [data, setData] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: { q: string; from: string; to: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.q.trim()) params.set("q", query.q.trim());
      if (query.from) params.set("from", query.from);
      if (query.to) params.set("to", query.to);
      const response = await fetch(`/api/v1/tracking?${params.toString()}`, {
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.message === "string"
            ? body.message
            : "Não foi possível carregar os relatórios",
        );
      }
      setData(body as ReportResponse);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Falha ao carregar os relatórios",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  if (loading && !data) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div>
        <h1 data-tone="green" className="ampara-title text-lg font-semibold text-[#1B2A41]">Relatórios</h1>
        <p className="text-sm text-[#6B7280]">
          {data
            ? `${data.reports.length} percurso${data.reports.length === 1 ? "" : "s"}`
            : "Percursos do período"}
        </p>
      </div>

      <ListSearch
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ q, from, to });
        }}
      >
        <ListSearchField
          value={q}
          onChange={setQ}
          placeholder="Preso ou vítima"
          label="Preso ou vítima"
        />
        <SearchDateRangeField
          from={from}
          to={to}
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
        <ListSearchSubmit />
      </ListSearch>

      <div>
        {error ? <p className="py-2 text-sm text-destructive">{error}</p> : null}

        {loading ? <p className="py-8 text-sm text-[#6B7280]">Carregando…</p> : null}

        {!loading && data && data.reports.length === 0 ? (
          <p className="py-8 text-sm text-[#6B7280]">
            Nenhum percurso neste período.
          </p>
        ) : null}

        {!loading && data && data.reports.length > 0 ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="ampara-thead text-sm font-semibold">
                <tr>
                  <th className="py-2.5 pr-4 pl-3 font-semibold">Preso</th>
                  <th className="py-2.5 pr-4 font-semibold">Vítima</th>
                  <th className="py-2.5 pr-4 font-semibold">Período</th>
                  <th className="py-2.5 pr-4 font-semibold">Menor distância</th>
                  <th className="py-2.5 pr-4 font-semibold">Violações</th>
                  <th className="w-28 py-2.5 pr-2 pl-1 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => {
                  const href = `/relatorios/${report.orderId}?from=${applied.from}&to=${applied.to}${applied.q.trim() ? `&q=${encodeURIComponent(applied.q.trim())}` : ""}`;
                  return (
                    <tr
                      key={report.orderId}
                      className="ampara-row cursor-pointer border-b border-[#F0F2F5] transition-colors"
                      onClick={() => router.push(href)}
                    >
                      <td className="py-3 pr-4 pl-3 font-normal text-[#1B2A41]">
                        {formatPersonName(report.inmateName)}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {formatPersonName(report.victimName)}
                      </td>
                      <td className="py-3 pr-4 font-normal whitespace-nowrap text-[#1B2A41]">
                        {formatCalendarDay(report.firstAt)} — {formatCalendarDay(report.lastAt)}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {formatMeters(report.minDistanceMeters)}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#B42318] tabular-nums dark:text-[#FCA5A5]">
                        {report.violationCount}
                      </td>
                      <td className="w-28 py-3 pr-2 pl-1">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={href}
                            aria-label={`Ver percurso de ${report.inmateName}`}
                            title="Ver percurso"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-xs" }),
                              "cursor-pointer text-[#1B7A4A] hover:bg-transparent hover:text-[#16633C] dark:text-[#8ED4A8] dark:hover:text-white",
                            )}
                          >
                            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                          </Link>
                          <RowDeleteButton
                            label={`Excluir relatório de ${report.inmateName}`}
                            confirmMessage={`Excluir o percurso de ${report.inmateName} entre ${formatDay(applied.from)} e ${formatDay(applied.to)}? A medida protetiva permanece.`}
                            onDelete={async () => {
                              const params = new URLSearchParams({
                                from: applied.from,
                                to: applied.to,
                              });
                              const response = await fetch(
                                `/api/v1/tracking/${report.orderId}/delete?${params.toString()}`,
                                { method: "POST", credentials: "include" },
                              );
                              const body = await response.json().catch(() => ({}));
                              if (!response.ok) {
                                const message =
                                  typeof body.message === "string"
                                    ? body.message
                                    : "Não foi possível excluir o relatório";
                                setError(message);
                                throw new Error(message);
                              }
                              await load(applied);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

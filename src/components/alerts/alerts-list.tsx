"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { AlertStatusBadge } from "@/components/alerts/alert-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

type AlertRow = {
  id: string;
  publicId: string;
  status: string;
  openedAt: string;
  resolvedAt: string | null;
  lastDistanceM: number;
  triggerDistanceM: number;
  protectionOrder?: {
    id: string;
    publicId: string;
    judicialRef: string | null;
    victim?: { fullName: string } | null;
    inmate?: { fullName: string } | null;
  } | null;
};

type ListResponse = {
  data: AlertRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_FILTERS = [
  { value: "", label: "Todos os status" },
  { value: "OPEN", label: "Abertos" },
  { value: "RESOLVED", label: "Resolvidos" },
  { value: "FALSE_POSITIVE", label: "Falso positivo" },
] as const;

export function AlertsList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/v1/alerts?${params}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar os alertas",
        );
        setResult(null);
        return;
      }

      setResult(data as ListResponse);
    } catch {
      setError("Falha de comunicação com o servidor");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(q);
    setStatusFilter(status);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#1B2A41]">Alertas</h1>
        <p className="text-sm text-[#4B5563]">
          {result
            ? `${result.total} registro${result.total === 1 ? "" : "s"}`
            : "Carregando…"}
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex max-w-3xl flex-col gap-2 border border-[#D8DEE6] px-3 py-2.5 sm:flex-row"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Vítima, preso ou medida"
            className="h-9 bg-white pl-8"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 border border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41]"
          aria-label="Filtrar por status"
        >
          {STATUS_FILTERS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}
      {loading ? <p className="py-8 text-sm text-[#4B5563]">Carregando…</p> : null}
      {!loading && !error && result?.data.length === 0 ? (
        <p className="py-8 text-sm text-[#4B5563]">Nenhum alerta encontrado.</p>
      ) : null}

      {!loading && result && result.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="ampara-thead text-[12px] font-medium">
              <tr className="border-b border-[#E5E7EB]">
                <th className="py-2 pr-4 pl-3 font-medium">Situação</th>
                <th className="py-2 pr-4 font-medium">Vítima</th>
                <th className="py-2 pr-4 font-medium">Preso</th>
                <th className="py-2 pr-4 font-medium">Medida</th>
                <th className="py-2 pr-4 font-medium">Distância</th>
                <th className="py-2 pr-3 font-medium">Aberto em</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-[#E5E7EB] last:border-b-0"
                >
                  <td className="py-3 pr-4 pl-3">
                    <AlertStatusBadge status={alert.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/alerts/${alert.id}`}
                      className="font-medium text-[#1B2A41] hover:underline"
                    >
                      {alert.protectionOrder?.victim?.fullName ?? "—"}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-[#4B5563]">
                    {alert.protectionOrder?.inmate?.fullName ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-[#4B5563]">
                    {alert.protectionOrder?.judicialRef ||
                      alert.protectionOrder?.publicId ||
                      "—"}
                  </td>
                  <td className="py-3 pr-4 text-[#4B5563]">
                    {Math.round(alert.lastDistanceM)} m
                  </td>
                  <td className="py-3 pr-3 text-[#6B7280]">
                    {formatDate(alert.openedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {result && result.totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[#6B7280]">
            Página {result.page} de {result.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft data-icon="inline-start" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

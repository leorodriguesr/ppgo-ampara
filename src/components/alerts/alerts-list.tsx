"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { AlertStatusBadge } from "@/components/alerts/alert-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="size-5" />
              Alertas de proximidade
            </CardTitle>
            <CardDescription className="mt-1">
              Violações detectadas pelo motor de geofence.
            </CardDescription>
          </div>
        </div>

        <form
          onSubmit={applyFilters}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por vítima, preso ou medida..."
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Carregando alertas...
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!loading && !error && result?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum alerta encontrado.
          </p>
        ) : null}

        <ul className="divide-y rounded-lg border">
          {result?.data.map((alert) => (
            <li key={alert.id}>
              <Link
                href={`/alerts/${alert.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertStatusBadge status={alert.status} />
                    <span className="font-medium">
                      {alert.protectionOrder?.victim?.fullName ?? "Vítima"}
                      {" · "}
                      {alert.protectionOrder?.inmate?.fullName ?? "Preso"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Medida{" "}
                    {alert.protectionOrder?.judicialRef ||
                      alert.protectionOrder?.publicId ||
                      "—"}
                    {" · "}
                    Distância {Math.round(alert.lastDistanceM)} m
                    {" · "}
                    Aberto em {formatDate(alert.openedAt)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {alert.publicId.slice(0, 8)}…
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {result && result.totalPages > 1 ? (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Página {result.page} de {result.totalPages} · {result.total}{" "}
              alerta(s)
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
      </CardContent>
    </Card>
  );
}

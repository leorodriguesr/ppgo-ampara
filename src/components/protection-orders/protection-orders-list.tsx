"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { RowDeleteButton } from "@/components/layout/row-delete-button";
import { ProtectionOrderForm } from "@/components/protection-orders/protection-order-form";
import {
  ProtectionOrderSourceBadge,
  ProtectionOrderStatusBadge,
} from "@/components/protection-orders/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

type OrderRow = {
  id: string;
  publicId: string;
  status: string;
  radiusMeters: number;
  judicialRef: string | null;
  isSimulation: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  victim?: { fullName: string } | null;
  inmate?: { fullName: string } | null;
};

type ListResponse = {
  data: OrderRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_FILTERS = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "AWAITING_PAIRING", label: "Aguardando pareamento" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "SUSPENDED", label: "Suspensa" },
  { value: "CLOSED", label: "Encerrada" },
] as const;

export function ProtectionOrdersList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
      const res = await fetch(`/api/v1/protection-orders?${params}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar as medidas protetivas",
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

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(q);
    setStatusFilter(status);
  }

  async function deleteOrder(id: string) {
    const res = await fetch(`/api/v1/protection-orders/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.message === "string"
          ? data.message
          : "Não foi possível excluir a medida protetiva",
      );
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1B2A41]">
            Medidas protetivas
          </h1>
          <p className="text-sm text-[#6B7280]">
            {result
              ? `${result.total} cadastrada${result.total === 1 ? "" : "s"}`
              : "Vínculo entre vítima e preso"}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-[#1B2A41] text-white hover:bg-[#24364f]"
        >
          <Plus data-icon="inline-start" />
          Nova medida
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex max-w-3xl flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2.5"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            id="order-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por processo, vítima ou preso"
            className="h-9 bg-white pl-8"
          />
        </div>
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-w-[220px]"
          aria-label="Filtrar por status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" size="sm">
          Buscar
        </Button>
      </form>

      <div>
        {error ? (
          <p className="py-2 text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <p className="py-8 text-sm text-[#6B7280]">Carregando…</p>
        ) : null}

        {!loading && result && result.data.length === 0 ? (
          <p className="py-8 text-sm text-[#6B7280]">
            Nenhuma medida protetiva encontrada.
          </p>
        ) : null}

        {!loading && result && result.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#E8EAED] text-[12px] font-medium text-[#4B5563]">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-2 pr-4 pl-3 font-medium">Processo</th>
                  <th className="py-2 pr-4 font-medium">Vítima</th>
                  <th className="py-2 pr-4 font-medium">Preso</th>
                  <th className="py-2 pr-4 font-medium">Raio</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Fonte</th>
                  <th className="py-2 pr-3 font-medium">Vigência</th>
                  <th className="w-9 py-2 pr-2 pl-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((order) => (
                  <tr
                    key={order.id}
                    tabIndex={0}
                    className="cursor-pointer border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#EEF0F3] focus-visible:bg-[#EEF0F3] focus-visible:outline-none"
                    onClick={() => router.push(`/protection-orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/protection-orders/${order.id}`);
                      }
                    }}
                  >
                    <td className="py-3 pr-4 pl-3 font-medium text-[#1B2A41]">
                      {order.judicialRef || order.publicId}
                    </td>
                    <td className="py-3 pr-4 text-[#4B5563]">
                      {order.victim?.fullName || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[#4B5563]">
                      {order.inmate?.fullName || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[#4B5563]">
                      {order.radiusMeters} m
                    </td>
                    <td className="py-3 pr-4">
                      <ProtectionOrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <ProtectionOrderSourceBadge
                        isSimulation={order.isSimulation !== false}
                      />
                    </td>
                    <td className="py-3 whitespace-nowrap text-[#6B7280]">
                      {order.startsAt || order.endsAt
                        ? `${order.startsAt ? formatDateTime(order.startsAt) : "—"} → ${order.endsAt ? formatDateTime(order.endsAt) : "—"}`
                        : "—"}
                    </td>
                    <td className="w-9 py-3 pr-2 pl-1">
                      <RowDeleteButton
                        label="Excluir medida"
                        confirmMessage={`Excluir a medida ${order.judicialRef || order.publicId}? Pareamentos e alertas ligados a ela também serão removidos.`}
                        onDelete={() => deleteOrder(order.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {result && result.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-3">
            <p className="text-xs text-[#6B7280]">
              Página {result.page} de {result.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft data-icon="inline-start" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= result.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nova medida protetiva</DialogTitle>
            <DialogDescription>
              Vincule vítima e preso e defina o raio e a vigência.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pt-4">
            <ProtectionOrderForm
              key={createOpen ? "open" : "closed"}
              mode="create"
              onCancel={() => setCreateOpen(false)}
              onSuccess={() => {
                setCreateOpen(false);
                setPage(1);
                void load();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

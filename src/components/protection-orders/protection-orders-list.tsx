"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plug2, Plus } from "lucide-react";

import { RowDeleteButton } from "@/components/layout/row-delete-button";
import { PageLoading } from "@/components/layout/page-loading";
import {
  ListSearch,
  ListSearchField,
  ListSearchSubmit,
} from "@/components/layout/list-search";
import { OrderConnectDialog } from "@/components/protection-orders/order-connect-dialog";
import { ProtectionOrderForm } from "@/components/protection-orders/protection-order-form";
import { ProtectionOrderStatusBadge } from "@/components/protection-orders/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDay, formatPersonName } from "@/lib/format";

type OrderRow = {
  id: string;
  publicId: string;
  status: string;
  radiusMeters: number;
  watchRadiusMeters?: number;
  judicialRef: string | null;
  isSimulation: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  victim?: { fullName: string } | null;
  inmate?: { fullName: string } | null;
};

type OrderDetail = OrderRow & {
  victimId: string;
  inmateId: string;
  victim?: {
    id: string;
    publicId: string;
    fullName: string;
    phone: string | null;
  } | null;
  inmate?: {
    id: string;
    publicId: string;
    fullName: string;
    externalInmateId: string;
  } | null;
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
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [editing, setEditing] = useState<OrderDetail | null>(null);
  const [editBusyId, setEditBusyId] = useState<string | null>(null);

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

  async function openEdit(id: string) {
    setEditBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/protection-orders/${id}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar a medida",
        );
        return;
      }
      setEditing(data as OrderDetail);
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setEditBusyId(null);
    }
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

  if (loading && !result) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 data-tone="violet" className="ampara-title text-lg font-semibold text-[#1B2A41]">
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
          className="ampara-create cursor-pointer"
        >
          <Plus data-icon="inline-start" />
          Nova medida
        </Button>
      </div>

      <ListSearch onSubmit={handleSearch}>
        <ListSearchField
          id="order-search"
          value={q}
          onChange={setQ}
          placeholder="Processo, vítima ou preso"
          label="Processo, vítima ou preso"
        />
        <NativeSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 w-40 cursor-pointer rounded-none border-0 border-l border-border bg-transparent px-3 text-sm text-foreground shadow-none focus-visible:ring-0 dark:bg-transparent dark:text-foreground"
          aria-label="Filtrar por status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <ListSearchSubmit />
      </ListSearch>

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
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[860px] text-left text-sm whitespace-nowrap">
              <thead className="ampara-thead text-sm font-semibold">
                <tr>
                  <th className="py-2.5 pr-4 pl-3 font-semibold">Processo</th>
                  <th className="py-2.5 pr-4 font-semibold">Vítima</th>
                  <th className="py-2.5 pr-4 font-semibold">Preso</th>
                  <th className="py-2.5 pr-4 font-semibold">Raio de Proteção</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-3 font-semibold">Vigência</th>
                  <th className="w-28 py-2.5 pr-2 pl-1 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((order) => (
                  <tr
                    key={order.id}
                    className="ampara-row border-b border-[#F0F2F5] transition-colors"
                  >
                    <td className="py-3 pr-4 pl-3 font-normal text-[#1B2A41]">
                      {order.judicialRef || order.publicId}
                    </td>
                    <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                      {order.victim?.fullName
                        ? formatPersonName(order.victim.fullName)
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                      {order.inmate?.fullName
                        ? formatPersonName(order.inmate.fullName)
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                      {order.radiusMeters} m
                    </td>
                    <td className="py-3 pr-4">
                      <ProtectionOrderStatusBadge status={order.status} plain />
                    </td>
                    <td className="py-3 pr-3 font-normal text-[#1B2A41]">
                      {order.startsAt || order.endsAt
                        ? `${order.startsAt ? formatDay(order.startsAt) : "—"} - ${order.endsAt ? formatDay(order.endsAt) : "—"}`
                        : "—"}
                    </td>
                    <td className="w-28 py-3 pr-2 pl-1">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Pareamento da medida"
                          title="Pareamento"
                          className="cursor-pointer text-[#0F766E] hover:bg-transparent hover:text-[#0C5C56] dark:text-[#7DCDC4] dark:hover:text-white"
                          onClick={() => setConnectingId(order.id)}
                        >
                          {connectLoading && connectingId === order.id ? (
                            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                          ) : (
                            <Plug2 className="size-3.5" strokeWidth={1.75} />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Editar medida"
                          title="Editar medida"
                          className="cursor-pointer text-[#8A6A08] hover:bg-transparent hover:text-[#6E5406] dark:text-[#F0D36A] dark:hover:text-white"
                          onClick={() => void openEdit(order.id)}
                        >
                          {editBusyId === order.id ? (
                            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                          ) : (
                            <Pencil className="size-3.5" strokeWidth={1.75} />
                          )}
                        </Button>
                        <RowDeleteButton
                          label="Excluir medida"
                          confirmMessage={`Excluir a medida ${order.judicialRef || order.publicId}? Pareamentos e alertas ligados a ela também serão removidos.`}
                          onDelete={() => deleteOrder(order.id)}
                        />
                      </div>
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

      <OrderConnectDialog
        orderId={connectingId}
        onOpenChange={(open) => {
          if (!open) setConnectingId(null);
        }}
        onChanged={() => void load()}
        onLoadingChange={setConnectLoading}
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent tone="violet" className="flex h-[min(720px,calc(100svh-2rem))] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="violet">Editar medida protetiva</DialogTitle>
            <DialogDescription>
              {editing?.judicialRef ? `Processo ${editing.judicialRef}` : "Cadastro da medida"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            {editing?.status === "CLOSED" ? (
              <p className="mx-5 mt-4 shrink-0 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2 text-sm leading-6 text-[#4B5563]">
                Esta medida está encerrada. O cadastro pode ser alterado. O
                pareamento só volta depois da reabertura.
              </p>
            ) : null}
            {editing && editing.victimId ? (
              <ProtectionOrderForm
                key={editing.id}
                pinnedFooter
                mode="edit"
                orderId={editing.id}
                initialValues={{
                  victimId: editing.victimId,
                  inmateId: editing.inmateId,
                  radiusMeters: editing.radiusMeters,
                  watchRadiusMeters: editing.watchRadiusMeters,
                  isSimulation: editing.isSimulation !== false,
                  judicialRef: editing.judicialRef,
                  startsAt: editing.startsAt,
                  endsAt: editing.endsAt,
                  victim: editing.victim,
                  inmate: editing.inmate,
                }}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  setEditing(null);
                  void load();
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent tone="violet" className="flex h-[min(720px,calc(100svh-2rem))] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="violet">Nova medida protetiva</DialogTitle>
            <DialogDescription>
              Vincule vítima e preso e defina o raio e a vigência.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <ProtectionOrderForm
              key={createOpen ? "open" : "closed"}
              pinnedFooter
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

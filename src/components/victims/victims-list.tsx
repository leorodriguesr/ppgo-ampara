"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Plus } from "lucide-react";

import { RowDeleteButton } from "@/components/layout/row-delete-button";
import { PageLoading } from "@/components/layout/page-loading";
import {
  ListSearch,
  ListSearchField,
  ListSearchSubmit,
} from "@/components/layout/list-search";
import { PersonDetailDialog } from "@/components/people/person-detail-dialog";
import { VictimForm } from "@/components/victims/victim-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAddress, formatDay, formatPersonName } from "@/lib/format";

type LinkedOrder = {
  id: string;
  publicId: string;
  judicialRef: string | null;
  status: string;
  radiusMeters: number;
  watchRadiusMeters: number;
  createdAt: string;
  inmate?: { fullName: string } | null;
};

type VictimRow = {
  id: string;
  publicId: string;
  fullName: string;
  phone: string | null;
  document: string | null;
  createdAt: string;
  _count?: { protectionOrders: number };
};

type VictimDetail = VictimRow & {
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  protectionOrders: LinkedOrder[];
};

type ListResponse = {
  data: VictimRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function VictimsList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VictimDetail | null>(null);
  const [details, setDetails] = useState<Record<string, VictimDetail>>({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailBusyId, setDetailBusyId] = useState<string | null>(null);
  const [editBusyId, setEditBusyId] = useState<string | null>(null);
  const detailRequest = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (search.trim()) params.set("q", search.trim());

    try {
      const res = await fetch(`/api/v1/victims?${params}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar as vítimas",
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
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(q);
  }

  async function loadDetail(id: string, force = false) {
    const cached = details[id];
    if (cached && !force) return cached;

    const res = await fetch(`/api/v1/victims/${id}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Não foi possível carregar a vítima",
      );
    }
    const detail = data as VictimDetail;
    setDetails((current) => ({ ...current, [id]: detail }));
    return detail;
  }

  async function openDetails(id: string) {
    const request = ++detailRequest.current;
    setViewingId(id);
    setDetailError(null);
    if (details[id]) {
      setDetailBusyId(null);
      return;
    }
    setDetailBusyId(id);
    try {
      await loadDetail(id);
    } catch (failure) {
      if (detailRequest.current !== request) return;
      setDetailError(
        failure instanceof Error ? failure.message : "Não foi possível carregar a vítima",
      );
    } finally {
      if (detailRequest.current === request) setDetailBusyId(null);
    }
  }

  async function openEdit(id: string) {
    setEditBusyId(id);
    try {
      setEditing(await loadDetail(id));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Não foi possível carregar a vítima",
      );
    } finally {
      setEditBusyId((current) => (current === id ? null : current));
    }
  }

  async function deleteVictim(id: string) {
    const res = await fetch(`/api/v1/victims/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.message === "string"
          ? data.message
          : "Não foi possível excluir a vítima",
      );
      return;
    }
    await load();
  }

  const viewingRow = result?.data.find((item) => item.id === viewingId) ?? null;
  const viewingDetail = viewingId ? details[viewingId] : undefined;
  const viewing = viewingDetail ?? viewingRow;

  if (loading && !result) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 data-tone="rose" className="ampara-title text-lg font-semibold text-[#1B2A41]">
            Vítimas
          </h1>
          <p className="text-sm text-[#6B7280]">
            {result
              ? `${result.total} cadastrada${result.total === 1 ? "" : "s"}`
              : "Cadastro para medidas protetivas"}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ampara-create cursor-pointer"
        >
          <Plus data-icon="inline-start" />
          Nova Vítima
        </Button>
      </div>

      <ListSearch onSubmit={handleSearch}>
        <ListSearchField
          id="victim-search"
          value={q}
          onChange={setQ}
          placeholder="Nome, telefone ou documento"
          label="Nome, telefone ou documento"
        />
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
            Nenhuma vítima encontrada.
          </p>
        ) : null}

        {!loading && result && result.data.length > 0 ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="ampara-thead text-sm font-semibold">
                <tr>
                  <th className="py-2.5 pr-4 pl-3 font-semibold">Nome</th>
                  <th className="py-2.5 pr-4 font-semibold">Telefone</th>
                  <th className="py-2.5 pr-4 font-semibold">Documento</th>
                  <th className="py-2.5 pr-4 font-semibold">Medidas</th>
                  <th className="py-2.5 pr-3 font-semibold">Cadastro</th>
                  <th className="w-28 py-2.5 pr-2 pl-1 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((victim) => {
                  return (
                    <tr
                      key={victim.id}
                      className="ampara-row border-b border-[#F0F2F5] transition-colors"
                    >
                      <td className="py-3 pr-4 pl-3 font-normal text-[#1B2A41]">
                        {formatPersonName(victim.fullName)}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {victim.phone || "—"}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {victim.document || "—"}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {victim._count?.protectionOrders ?? 0}
                      </td>
                      <td className="py-3 pr-3 font-normal text-[#1B2A41]">
                        {formatDay(victim.createdAt)}
                      </td>
                      <td className="w-28 py-3 pr-2 pl-1">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Ver detalhes da vítima"
                            title="Ver detalhes"
                            className="cursor-pointer text-[#1565A8] hover:bg-transparent hover:text-[#115488] dark:text-[#8EC4EF] dark:hover:text-white"
                            onClick={() => void openDetails(victim.id)}
                          >
                            {detailBusyId === victim.id ? (
                              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Eye className="size-3.5" strokeWidth={1.75} />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Editar vítima"
                            title="Editar vítima"
                            className="cursor-pointer text-[#8A6A08] hover:bg-transparent hover:text-[#6E5406] dark:text-[#F0D36A] dark:hover:text-white"
                            onClick={() => void openEdit(victim.id)}
                          >
                            {editBusyId === victim.id ? (
                              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Pencil className="size-3.5" strokeWidth={1.75} />
                            )}
                          </Button>
                          <RowDeleteButton
                            label="Excluir vítima"
                            confirmMessage={`Excluir ${victim.fullName}? As medidas ligadas a esta vítima também serão removidas.`}
                            onDelete={() => deleteVictim(victim.id)}
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

      <PersonDetailDialog
        open={viewingId !== null && (Boolean(viewingDetail) || Boolean(detailError))}
        onOpenChange={(open) => {
          if (!open) setViewingId(null);
        }}
        name={viewing?.fullName ?? "Vítima"}
        description={
          viewing
            ? `Cadastrada em ${formatDay(viewing.createdAt)}`
            : "Carregando os dados da vítima"
        }
        fields={[
          { label: "Telefone", value: viewing?.phone || "—" },
          { label: "Documento", value: viewing?.document || "—" },
        ]}
        loading={Boolean(viewingId) && !viewingDetail && !detailError}
        error={viewingDetail ? null : detailError}
        address={viewingDetail ? formatAddress(viewingDetail) : null}
        orders={(viewingDetail?.protectionOrders ?? []).map((order) => ({
          id: order.id,
          publicId: order.publicId,
          judicialRef: order.judicialRef,
          status: order.status,
          radiusMeters: order.radiusMeters,
          watchRadiusMeters: order.watchRadiusMeters,
          createdAt: order.createdAt,
          counterpartName: order.inmate?.fullName ?? null,
          counterpartRole: "Preso",
        }))}
        ordersTotal={
          viewingDetail?._count?.protectionOrders ??
          viewingDetail?.protectionOrders.length ??
          0
        }
        onEdit={() => {
          if (!viewingDetail) return;
          setViewingId(null);
          setEditing(viewingDetail);
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent tone="rose" className="flex max-h-[min(760px,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="rose">Nova vítima</DialogTitle>
            <DialogDescription>
              Preencha os dados cadastrais. O nome é obrigatório.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
            <VictimForm
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent tone="rose" className="flex max-h-[min(760px,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="rose">Editar vítima</DialogTitle>
            <DialogDescription>
              Atualize os dados cadastrais. O nome é obrigatório.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
              <VictimForm
                key={editing.id}
                mode="edit"
                victimId={editing.id}
                initialValues={editing}
                onCancel={() => setEditing(null)}
                onSuccess={() => {
                  const id = editing.id;
                  setEditing(null);
                  void load();
                  void loadDetail(id, true);
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

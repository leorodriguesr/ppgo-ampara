"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Plus } from "lucide-react";

import { InmateForm } from "@/components/inmates/inmate-form";
import { PageLoading } from "@/components/layout/page-loading";
import { RowDeleteButton } from "@/components/layout/row-delete-button";
import {
  ListSearch,
  ListSearchField,
  ListSearchSubmit,
} from "@/components/layout/list-search";
import { PersonDetailDialog } from "@/components/people/person-detail-dialog";
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
  victim?: { fullName: string } | null;
};

type InmateRow = {
  id: string;
  fullName: string;
  externalInmateId: string;
  document: string | null;
  createdAt: string;
  _count?: { protectionOrders: number };
};

type InmateDetail = InmateRow & {
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
  data: InmateRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function InmatesList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<InmateDetail | null>(null);
  const [details, setDetails] = useState<Record<string, InmateDetail>>({});
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
      const res = await fetch(`/api/v1/inmates?${params}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar os presos",
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

    const res = await fetch(`/api/v1/inmates/${id}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Não foi possível carregar o preso",
      );
    }
    const detail = data as InmateDetail;
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
        failure instanceof Error ? failure.message : "Não foi possível carregar o preso",
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
        failure instanceof Error ? failure.message : "Não foi possível carregar o preso",
      );
    } finally {
      setEditBusyId((current) => (current === id ? null : current));
    }
  }

  async function deleteInmate(id: string) {
    const res = await fetch(`/api/v1/inmates/${id}/delete`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.message === "string"
          ? data.message
          : "Não foi possível excluir o preso",
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
          <h1 data-tone="indigo" className="ampara-title text-lg font-semibold text-[#1B2A41]">
            Presos
          </h1>
          <p className="text-sm text-[#6B7280]">
            {result
              ? `${result.total} cadastrado${result.total === 1 ? "" : "s"}`
              : "Cadastro para medidas protetivas"}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ampara-create cursor-pointer"
        >
          <Plus data-icon="inline-start" />
          Novo preso
        </Button>
      </div>

      <ListSearch onSubmit={handleSearch}>
        <ListSearchField
          id="inmate-search"
          value={q}
          onChange={setQ}
          placeholder="Nome, ID da tornozeleira ou documento"
          label="Nome, ID da tornozeleira ou documento"
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
          <p className="py-8 text-sm text-[#6B7280]">Nenhum preso encontrado.</p>
        ) : null}

        {!loading && result && result.data.length > 0 ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="ampara-thead text-sm font-semibold">
                <tr>
                  <th className="py-2.5 pr-4 pl-3 font-semibold">Nome</th>
                  <th className="py-2.5 pr-4 font-semibold">ID tornozeleira</th>
                  <th className="py-2.5 pr-4 font-semibold">Documento</th>
                  <th className="py-2.5 pr-4 font-semibold">Medidas</th>
                  <th className="py-2.5 pr-3 font-semibold">Cadastro</th>
                  <th className="w-28 py-2.5 pr-2 pl-1 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((inmate) => {
                  return (
                    <tr
                      key={inmate.id}
                      className="ampara-row border-b border-[#F0F2F5] transition-colors"
                    >
                      <td className="py-3 pr-4 pl-3 font-normal text-[#1B2A41]">
                        {formatPersonName(inmate.fullName)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-sm font-normal text-[#1B2A41]">
                        {inmate.externalInmateId}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {inmate.document || "—"}
                      </td>
                      <td className="py-3 pr-4 font-normal text-[#1B2A41]">
                        {inmate._count?.protectionOrders ?? 0}
                      </td>
                      <td className="py-3 pr-3 font-normal text-[#1B2A41]">
                        {formatDay(inmate.createdAt)}
                      </td>
                      <td className="w-28 py-3 pr-2 pl-1">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Ver detalhes do preso"
                            title="Ver detalhes"
                            className="cursor-pointer text-[#1565A8] hover:bg-transparent hover:text-[#115488] dark:text-[#8EC4EF] dark:hover:text-white"
                            onClick={() => void openDetails(inmate.id)}
                          >
                            {detailBusyId === inmate.id ? (
                              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Eye className="size-3.5" strokeWidth={1.75} />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Editar preso"
                            title="Editar preso"
                            className="cursor-pointer text-[#8A6A08] hover:bg-transparent hover:text-[#6E5406] dark:text-[#F0D36A] dark:hover:text-white"
                            onClick={() => void openEdit(inmate.id)}
                          >
                            {editBusyId === inmate.id ? (
                              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Pencil className="size-3.5" strokeWidth={1.75} />
                            )}
                          </Button>
                          <RowDeleteButton
                            label="Excluir preso"
                            confirmMessage={`Excluir ${inmate.fullName}? As medidas ligadas a este preso também serão removidas.`}
                            onDelete={() => deleteInmate(inmate.id)}
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
        name={viewing?.fullName ?? "Preso"}
        description={
          viewing
            ? `Cadastrado em ${formatDay(viewing.createdAt)}`
            : "Carregando os dados do preso"
        }
        fields={[
          { label: "ID da tornozeleira", value: viewing?.externalInmateId || "—" },
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
          counterpartName: order.victim?.fullName ?? null,
          counterpartRole: "Vítima",
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
        <DialogContent tone="indigo" className="flex max-h-[min(760px,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="indigo">Novo preso</DialogTitle>
            <DialogDescription>
              Preencha os dados cadastrais. Nome e ID da tornozeleira são
              obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
            <InmateForm
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
        <DialogContent tone="indigo" className="flex max-h-[min(760px,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle tone="indigo">Editar preso</DialogTitle>
            <DialogDescription>
              Atualize os dados cadastrais. Nome e ID da tornozeleira são
              obrigatórios.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
              <InmateForm
                key={editing.id}
                mode="edit"
                inmateId={editing.id}
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { InmateForm } from "@/components/inmates/inmate-form";
import { RowDeleteButton } from "@/components/layout/row-delete-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

type InmateRow = {
  id: string;
  fullName: string;
  externalInmateId: string;
  document: string | null;
  createdAt: string;
  _count?: { protectionOrders: number };
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

  async function deleteInmate(id: string) {
    const res = await fetch(`/api/v1/inmates/${id}`, {
      method: "DELETE",
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1B2A41]">
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
          className="cursor-pointer bg-[#1B2A41] text-white hover:bg-[#24364f]"
        >
          <Plus data-icon="inline-start" />
          Novo preso
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex max-w-xl flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2.5"
      >
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            id="inmate-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, ID da tornozeleira ou documento"
            className="h-9 bg-white pl-8"
          />
        </div>
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
          <p className="py-8 text-sm text-[#6B7280]">Nenhum preso encontrado.</p>
        ) : null}

        {!loading && result && result.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#E8EAED] text-[12px] font-medium text-[#4B5563]">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-2 pr-4 pl-3 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">ID tornozeleira</th>
                  <th className="py-2 pr-4 font-medium">Documento</th>
                  <th className="py-2 pr-4 font-medium">Medidas</th>
                  <th className="py-2 pr-3 font-medium">Cadastro</th>
                  <th className="w-9 py-2 pr-2 pl-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((inmate) => (
                  <tr
                    key={inmate.id}
                    className="border-b border-[#E5E7EB] last:border-b-0"
                  >
                    <td className="py-3 pr-4 pl-3">
                      <Link
                        href={`/inmates/${inmate.id}`}
                        className="font-medium text-[#1B2A41] hover:underline"
                      >
                        {inmate.fullName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[#4B5563]">
                      {inmate.externalInmateId}
                    </td>
                    <td className="py-3 pr-4 text-[#4B5563]">
                      {inmate.document || "—"}
                    </td>
                    <td className="py-3 pr-4 text-[#4B5563]">
                      {inmate._count?.protectionOrders ?? 0}
                    </td>
                    <td className="py-3 text-[#6B7280]">
                      {formatDate(inmate.createdAt)}
                    </td>
                    <td className="w-9 py-3 pr-2 pl-1">
                      <RowDeleteButton
                        label="Excluir preso"
                        confirmMessage={`Excluir ${inmate.fullName}? As medidas ligadas a este preso também serão removidas.`}
                        onDelete={() => deleteInmate(inmate.id)}
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
        <DialogContent className="max-w-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Novo preso</DialogTitle>
            <DialogDescription>
              Preencha os dados cadastrais. Nome e ID da tornozeleira são
              obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pt-4">
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
    </div>
  );
}

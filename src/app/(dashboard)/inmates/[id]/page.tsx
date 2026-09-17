"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";

import { InmateForm } from "@/components/inmates/inmate-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type ProtectionOrderSummary = {
  id: string;
  publicId: string;
  status: string;
  radiusMeters: number;
  createdAt: string;
};

type InmateDetail = {
  id: string;
  publicId: string;
  fullName: string;
  externalInmateId: string;
  document: string | null;
  notes: string | null;
  createdAt: string;
  createdBy?: { name: string; email: string } | null;
  protectionOrders: ProtectionOrderSummary[];
  _count: { protectionOrders: number };
};

export default function InmateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [inmate, setInmate] = useState<InmateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/inmates/${id}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar o preso",
        );
        setInmate(null);
        return;
      }

      setInmate(data as InmateDetail);
    } catch {
      setError("Falha de comunicação com o servidor");
      setInmate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Carregando preso...
      </p>
    );
  }

  if (error || !inmate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" render={<Link href="/inmates" />}>
          <ArrowLeft data-icon="inline-start" />
          Voltar para lista
        </Button>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Preso não encontrado"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" render={<Link href="/inmates" />}>
            <ArrowLeft data-icon="inline-start" />
            Voltar para lista
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {inmate.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            ID público {inmate.publicId} · ID detento{" "}
            <span className="font-mono text-xs">{inmate.externalInmateId}</span>{" "}
            · cadastrado em {formatDate(inmate.createdAt)}
            {inmate.createdBy ? ` por ${inmate.createdBy.name}` : ""}
          </p>
        </div>
        <Badge variant="secondary">
          {inmate._count.protectionOrders} medida
          {inmate._count.protectionOrders === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#1B2A41]">Dados cadastrais</h2>
        <InmateForm
          mode="edit"
          inmateId={inmate.id}
          initialValues={{
            fullName: inmate.fullName,
            externalInmateId: inmate.externalInmateId,
            document: inmate.document,
            notes: inmate.notes,
          }}
          onSuccess={() => void load()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4" />
            Medidas protetivas
          </CardTitle>
          <CardDescription>
            Vínculos existentes (somente leitura nesta etapa).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inmate.protectionOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma medida protetiva vinculada a este preso.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {inmate.protectionOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{order.publicId}</p>
                    <p className="text-xs text-muted-foreground">
                      Raio {order.radiusMeters} m · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{order.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

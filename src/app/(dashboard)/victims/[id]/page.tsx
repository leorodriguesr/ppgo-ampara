"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";

import { VictimForm } from "@/components/victims/victim-form";
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

type VictimDetail = {
  id: string;
  publicId: string;
  fullName: string;
  phone: string | null;
  document: string | null;
  notes: string | null;
  createdAt: string;
  createdBy?: { name: string; email: string } | null;
  protectionOrders: ProtectionOrderSummary[];
  _count: { protectionOrders: number };
};

export default function VictimDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [victim, setVictim] = useState<VictimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/victims/${id}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar a vítima",
        );
        setVictim(null);
        return;
      }

      setVictim(data as VictimDetail);
    } catch {
      setError("Falha de comunicação com o servidor");
      setVictim(null);
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
        Carregando vítima...
      </p>
    );
  }

  if (error || !victim) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" render={<Link href="/victims" />}>
          <ArrowLeft data-icon="inline-start" />
          Voltar para lista
        </Button>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Vítima não encontrada"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" render={<Link href="/victims" />}>
            <ArrowLeft data-icon="inline-start" />
            Voltar para lista
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {victim.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            ID público {victim.publicId} · cadastrada em{" "}
            {formatDate(victim.createdAt)}
            {victim.createdBy ? ` por ${victim.createdBy.name}` : ""}
          </p>
        </div>
        <Badge variant="secondary">
          {victim._count.protectionOrders} medida
          {victim._count.protectionOrders === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#1B2A41]">Dados cadastrais</h2>
        <VictimForm
          mode="edit"
          victimId={victim.id}
          initialValues={{
            fullName: victim.fullName,
            phone: victim.phone,
            document: victim.document,
            notes: victim.notes,
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
          {victim.protectionOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma medida protetiva vinculada a esta vítima.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {victim.protectionOrders.map((order) => (
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

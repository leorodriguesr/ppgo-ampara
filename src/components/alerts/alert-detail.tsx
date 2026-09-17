"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

type AlertDetail = {
  id: string;
  publicId: string;
  status: string;
  openedAt: string;
  resolvedAt: string | null;
  triggerDistanceM: number;
  lastDistanceM: number;
  inmateLatitude: number;
  inmateLongitude: number;
  victimLatitude: number;
  victimLongitude: number;
  consecutiveHits: number;
  protectionOrder?: {
    id: string;
    publicId: string;
    judicialRef: string | null;
    radiusMeters: number;
    geofenceState: string;
    victim?: { fullName: string; publicId: string } | null;
    inmate?: {
      fullName: string;
      publicId: string;
      externalInmateId: string;
    } | null;
  } | null;
};

export function AlertDetailView({ alertId }: { alertId: string }) {
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/alerts/${alertId}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar o alerta",
        );
        setAlert(null);
        return;
      }

      setAlert(data as AlertDetail);
    } catch {
      setError("Falha de comunicação com o servidor");
      setAlert(null);
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(status: "RESOLVED" | "FALSE_POSITIVE" = "RESOLVED") {
    setActing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível resolver o alerta",
        );
        return;
      }

      setAlert(data as AlertDetail);
    } catch {
      setActionError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Carregando alerta...
      </p>
    );
  }

  if (error || !alert) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" render={<Link href="/alerts" />}>
          <ArrowLeft data-icon="inline-start" />
          Voltar para alertas
        </Button>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Alerta não encontrado"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" render={<Link href="/alerts" />}>
            <ArrowLeft data-icon="inline-start" />
            Voltar para alertas
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Alerta de proximidade
          </h1>
          <p className="text-sm text-muted-foreground">
            ID público {alert.publicId} · aberto em {formatDate(alert.openedAt)}
          </p>
        </div>
        <AlertStatusBadge status={alert.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medida e pessoas</CardTitle>
          <CardDescription>
            Vínculo com a medida protetiva que gerou o alerta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Vítima</p>
            <p className="font-medium">
              {alert.protectionOrder?.victim?.fullName ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Preso</p>
            <p className="font-medium">
              {alert.protectionOrder?.inmate?.fullName ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {alert.protectionOrder?.inmate?.externalInmateId}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Medida</p>
            {alert.protectionOrder ? (
              <Link
                href={`/protection-orders/${alert.protectionOrder.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {alert.protectionOrder.judicialRef ||
                  alert.protectionOrder.publicId}
              </Link>
            ) : (
              <p className="font-medium">—</p>
            )}
            <p className="text-xs text-muted-foreground">
              Raio {alert.protectionOrder?.radiusMeters ?? "—"} m · geofence{" "}
              {alert.protectionOrder?.geofenceState ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distâncias e coordenadas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Distância no disparo</p>
            <p className="font-medium">
              {Math.round(alert.triggerDistanceM)} m
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Última distância</p>
            <p className="font-medium">{Math.round(alert.lastDistanceM)} m</p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Preso</p>
            <p className="font-mono text-sm">
              {alert.inmateLatitude.toFixed(6)},{" "}
              {alert.inmateLongitude.toFixed(6)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">Vítima</p>
            <p className="font-mono text-sm">
              {alert.victimLatitude.toFixed(6)},{" "}
              {alert.victimLongitude.toFixed(6)}
            </p>
          </div>
          {alert.resolvedAt ? (
            <div className="rounded-lg border px-3 py-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Resolvido em</p>
              <p className="font-medium">{formatDate(alert.resolvedAt)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {alert.status === "OPEN" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolver alerta</CardTitle>
            <CardDescription>
              Encerrar manualmente a violação (ação policial).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: equipe confirmou afastamento"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={acting}
                onClick={() => void resolve("RESOLVED")}
              >
                {acting ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : null}
                Resolver
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={acting}
                onClick={() => void resolve("FALSE_POSITIVE")}
              >
                Marcar falso positivo
              </Button>
            </div>
            {actionError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

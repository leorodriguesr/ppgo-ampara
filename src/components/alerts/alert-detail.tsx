"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AlertStatusBadge } from "@/components/alerts/alert-status-badge";
import { Button } from "@/components/ui/button";
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
    return <p className="py-8 text-sm text-[#4B5563]">Carregando…</p>;
  }

  if (error || !alert) {
    return (
      <div className="space-y-3">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-sm text-[#4B5563] hover:text-[#1B2A41]"
        >
          <ArrowLeft className="size-3.5" />
          Alertas
        </Link>
        <p className="text-sm text-[#B42318]">
          {error ?? "Alerta não encontrado"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 text-sm text-[#4B5563] hover:text-[#1B2A41]"
        >
          <ArrowLeft className="size-3.5" />
          Alertas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-[#1B2A41]">
            {alert.protectionOrder?.victim?.fullName ?? "Alerta"}
          </h1>
          <AlertStatusBadge status={alert.status} />
        </div>
        <p className="mt-1 text-sm text-[#4B5563]">
          Aberto em {formatDate(alert.openedAt)}
          {alert.resolvedAt ? ` · resolvido em ${formatDate(alert.resolvedAt)}` : ""}
        </p>
      </div>

      <section className="border border-[#D8DEE6]">
        <h2 className="border-b border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#1B2A41]">
          Pessoas e medida
        </h2>
        <dl className="grid gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#6B7280]">Vítima</dt>
            <dd className="text-sm font-medium text-[#1B2A41]">
              {alert.protectionOrder?.victim?.fullName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6B7280]">Preso</dt>
            <dd className="text-sm font-medium text-[#1B2A41]">
              {alert.protectionOrder?.inmate?.fullName ?? "—"}
            </dd>
            {alert.protectionOrder?.inmate?.externalInmateId ? (
              <dd className="font-mono text-xs text-[#6B7280]">
                {alert.protectionOrder.inmate.externalInmateId}
              </dd>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[#6B7280]">Medida</dt>
            <dd className="text-sm font-medium text-[#1B2A41]">
              {alert.protectionOrder ? (
                <Link
                  href={`/medidas-protetivas/${alert.protectionOrder.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {alert.protectionOrder.judicialRef ||
                    alert.protectionOrder.publicId}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <dd className="text-xs text-[#6B7280]">
              Raio {alert.protectionOrder?.radiusMeters ?? "—"} m ·{" "}
              {alert.protectionOrder?.geofenceState ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border border-[#D8DEE6]">
        <h2 className="border-b border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#1B2A41]">
          Posição
        </h2>
        <dl className="grid gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#6B7280]">Distância no disparo</dt>
            <dd className="text-sm font-medium text-[#1B2A41]">
              {Math.round(alert.triggerDistanceM)} m
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6B7280]">Última distância</dt>
            <dd className="text-sm font-medium text-[#1B2A41]">
              {Math.round(alert.lastDistanceM)} m
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6B7280]">Coordenada do preso</dt>
            <dd className="font-mono text-sm text-[#1B2A41]">
              {alert.inmateLatitude.toFixed(6)}, {alert.inmateLongitude.toFixed(6)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#6B7280]">Coordenada da vítima</dt>
            <dd className="font-mono text-sm text-[#1B2A41]">
              {alert.victimLatitude.toFixed(6)}, {alert.victimLongitude.toFixed(6)}
            </dd>
          </div>
        </dl>
      </section>

      {alert.status === "OPEN" ? (
        <section className="border border-[#D8DEE6] px-4 py-4">
          <h2 className="text-sm font-semibold text-[#1B2A41]">Encerrar</h2>
          <div className="mt-3 space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
              Falso positivo
            </Button>
          </div>
          {actionError ? (
            <p className="mt-3 text-sm text-[#B42318]">{actionError}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

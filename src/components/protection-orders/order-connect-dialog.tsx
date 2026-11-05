"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { InmateLocationSimulator } from "@/components/protection-orders/inmate-location-simulator";
import { PairingQrCard } from "@/components/protection-orders/pairing-qr-card";
import { ReopenOrderControl } from "@/components/protection-orders/reopen-order-panel";
import { ProtectionOrderStatusBadge } from "@/components/protection-orders/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPersonName } from "@/lib/format";
import { violationBlocksClosure } from "@/lib/protection-order-violation";
import { vigenciaEnded } from "@/lib/vigencia-day";
import { cn } from "@/lib/utils";

type ConnectOrder = {
  id: string;
  publicId: string;
  judicialRef: string | null;
  status: string;
  radiusMeters: number;
  isSimulation: boolean;
  geofenceState?: string;
  violationOpen?: boolean;
  endsAt: string | null;
  victim?: { fullName: string } | null;
  inmate?: { fullName: string } | null;
};

type OrderConnectDialogProps = {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onLoadingChange?: (loading: boolean) => void;
};

type ConnectTab = "pairing" | "simulation";

export function OrderConnectDialog({
  orderId,
  onOpenChange,
  onChanged,
  onLoadingChange,
}: OrderConnectDialogProps) {
  const requestRef = useRef(0);
  const [order, setOrder] = useState<ConnectOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [tab, setTab] = useState<ConnectTab>("pairing");

  const load = useCallback(async (id: string, silent = false) => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    if (!silent) {
      setLoading(true);
      setOrder(null);
    }
    setError(null);
    try {
      const res = await fetch(`/api/v1/protection-orders/${id}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (request !== requestRef.current) return;
      if (!res.ok) {
        if (silent) return;
        setOrder(null);
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível carregar a medida",
        );
        return;
      }
      setOrder(data as ConnectOrder);
    } catch {
      if (request !== requestRef.current) return;
      setError("Falha de comunicação com o servidor");
    } finally {
      if (request === requestRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    if (!orderId) {
      requestRef.current += 1;
      setOrder(null);
      setError(null);
      setActionError(null);
      setLoading(false);
      setTab("pairing");
      return;
    }
    setTab("pairing");
    void load(orderId);
  }, [orderId, load]);

  const simulated = order ? order.isSimulation !== false : false;
  const heldByViolation = order
    ? (order.violationOpen ?? violationBlocksClosure(order.geofenceState))
    : false;
  const deadlinePassed = Boolean(order?.endsAt && vigenciaEnded(order.endsAt));
  const title = order
    ? `Processo ${order.judicialRef || order.publicId}`
    : "Pareamento";
  const people = [order?.victim?.fullName, order?.inmate?.fullName]
    .filter(Boolean)
    .map((name) => formatPersonName(name as string))
    .join(" · ");

  async function changeStatus(status: "AWAITING_PAIRING" | "CLOSED") {
    if (!order) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/protection-orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível alterar o status",
        );
        return;
      }
      setOrder(data as ConnectOrder);
      onChanged();
    } catch {
      setActionError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  const ready = !loading && order !== null;

  return (
    <Dialog
      open={orderId !== null && !loading && (order !== null || error !== null)}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        tone="teal"
        className={cn(
          "flex max-w-3xl flex-col overflow-hidden",
          order?.status === "CLOSED"
            ? "h-auto max-h-[min(720px,calc(100svh-2rem))]"
            : "h-[min(720px,calc(100svh-2rem))]",
        )}
      >
        {error && !order ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}

        {ready && order ? (
          <>
            <DialogHeader>
              <DialogTitle tone="teal" className="flex flex-wrap items-center gap-2">
                {title}
                <ProtectionOrderStatusBadge status={order.status} />
              </DialogTitle>
              <DialogDescription>{people}</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="space-y-4">
                {order.status === "CLOSED" ? (
                  <ReopenOrderControl
                    context="pairing"
                    orderId={order.id}
                    endsAt={order.endsAt}
                    onReopened={(next) => {
                      setOrder(next as ConnectOrder);
                      onChanged();
                    }}
                  />
                ) : (
                  <>
                    {simulated ? (
                      <div className="flex gap-1 border-b border-[#E5E7EB]">
                        {(
                          [
                            { id: "pairing", label: "Pareamento" },
                            { id: "simulation", label: "Simulação" },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={cn(
                              "cursor-pointer px-3 py-2 text-sm font-medium",
                              tab === item.id
                                ? "border-b-2 border-[var(--ampara-bar)] text-[var(--ampara-bar)]"
                                : "text-[#6B7280] hover:text-[#1B2A41]",
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {heldByViolation ? (
                      <p className="rounded-lg border border-[#F5D0A9] bg-[#FFF7ED] px-3 py-2 text-sm leading-6 text-[#9A3412]">
                        {deadlinePassed
                          ? "O prazo desta medida já terminou. Ela permanece ativa porque a violação ainda está em andamento. O encerramento e a desconexão do aparelho ficam disponíveis quando a violação terminar."
                          : "Enquanto a violação estiver em andamento, a medida não pode ser encerrada e o aparelho da vítima não pode ser desconectado."}
                      </p>
                    ) : null}

                    {actionError ? (
                      <p className="text-sm text-destructive">{actionError}</p>
                    ) : null}

                    {tab === "pairing" || !simulated ? (
                      order.status === "DRAFT" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-[#4B5563]">
                            A medida ainda é um rascunho. Libere o pareamento para gerar o QR.
                          </p>
                          <Button
                            type="button"
                            disabled={acting}
                            className="ampara-create cursor-pointer"
                            onClick={() => void changeStatus("AWAITING_PAIRING")}
                          >
                            {acting ? (
                              <Loader2 className="animate-spin" data-icon="inline-start" />
                            ) : null}
                            Liberar para pareamento
                          </Button>
                        </div>
                      ) : order.status === "AWAITING_PAIRING" || order.status === "ACTIVE" ? (
                        <PairingQrCard
                          orderId={order.id}
                          status={order.status}
                          disconnectBlocked={heldByViolation}
                          onOrderActivated={() => {
                            void load(order.id, true);
                            onChanged();
                          }}
                        />
                      ) : (
                        <p className="text-sm text-[#4B5563]">
                          O pareamento não está disponível neste status.
                        </p>
                      )
                    ) : (
                      <InmateLocationSimulator
                        orderId={order.id}
                        radiusMeters={order.radiusMeters}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {order.status !== "CLOSED" ? (
              <DialogFooter>
                <Button
                  type="button"
                  disabled={acting || heldByViolation}
                  className="cursor-pointer bg-[#B42318] text-white hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void changeStatus("CLOSED")}
                >
                  {acting ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : null}
                  Encerrar medida protetiva
                </Button>
              </DialogFooter>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

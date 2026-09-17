"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { InmateLocationSimulator } from "@/components/protection-orders/inmate-location-simulator";
import { PairingQrCard } from "@/components/protection-orders/pairing-qr-card";
import { ProtectionOrderForm } from "@/components/protection-orders/protection-order-form";
import { ReopenOrderPanel } from "@/components/protection-orders/reopen-order-panel";
import {
  ProtectionOrderSourceBadge,
  ProtectionOrderStatusBadge,
} from "@/components/protection-orders/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ProtectionOrderDetail = {
  id: string;
  publicId: string;
  status: string;
  radiusMeters: number;
  judicialRef: string | null;
  isSimulation: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
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
  createdBy?: { name: string; email: string } | null;
};

type DetailTab = "app" | "testes" | "cadastro";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "app", label: "Pareamento" },
  { id: "testes", label: "Simulador" },
  { id: "cadastro", label: "Cadastro" },
];

export default function ProtectionOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<ProtectionOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [reopenEndsAt, setReopenEndsAt] = useState("");
  const [tab, setTab] = useState<DetailTab>("app");

  const load = useCallback(async () => {
    setLoading(true);
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
            : "Não foi possível carregar a medida protetiva",
        );
        setOrder(null);
        return;
      }

      const detail = data as ProtectionOrderDetail;
      setOrder(detail);
      if (detail.status === "CLOSED") {
        setReopenEndsAt(toDatetimeLocalValue(detail.endsAt));
      }
    } catch {
      setError("Falha de comunicação com o servidor");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (order && order.isSimulation === false && tab === "testes") {
      setTab("app");
    }
  }, [order, tab]);

  async function changeStatus(status: "AWAITING_PAIRING" | "CLOSED") {
    setActing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/protection-orders/${id}/status`, {
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

      setOrder(data as ProtectionOrderDetail);
    } catch {
      setActionError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  async function reopenOrder() {
    if (!reopenEndsAt.trim()) {
      setActionError("Informe o novo prazo de término");
      return;
    }

    setActing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/protection-orders/${id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endsAt: new Date(reopenEndsAt).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível reabrir a medida",
        );
        return;
      }

      setOrder(data as ProtectionOrderDetail);
    } catch {
      setActionError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[#6B7280]">
        Carregando medida protetiva...
      </p>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          render={<Link href="/protection-orders" />}
          aria-label="Voltar para medidas protetivas"
        >
          <ArrowLeft />
        </Button>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Medida protetiva não encontrada"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 bg-white"
            render={<Link href="/protection-orders" />}
            aria-label="Voltar para medidas protetivas"
          >
            <ArrowLeft />
          </Button>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#1B2A41]">
              Processo {order.judicialRef || order.publicId}
            </h1>
            <ProtectionOrderStatusBadge status={order.status} />
            <ProtectionOrderSourceBadge
              isSimulation={order.isSimulation !== false}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.status === "DRAFT" ? (
            <Button
              type="button"
              disabled={acting}
              className="bg-[#1B2A41] text-white hover:bg-[#24364f]"
              onClick={() => void changeStatus("AWAITING_PAIRING")}
            >
              {acting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Liberar para pareamento
            </Button>
          ) : null}
          {order.status !== "CLOSED" ? (
            <Button
              type="button"
              disabled={acting}
              className="cursor-pointer bg-[#B42318] text-white hover:bg-[#912018]"
              onClick={() => void changeStatus("CLOSED")}
            >
              Encerrar medida protetiva
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 border-b border-[#E5E7EB]">
        {TABS.filter(
          (item) => item.id !== "testes" || order.isSimulation !== false,
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "cursor-pointer px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-b-2 border-[#1B2A41] text-[#1B2A41]"
                : "text-[#6B7280] hover:text-[#1B2A41]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {order.status === "CLOSED" ? (
        <ReopenOrderPanel
          endsAt={order.endsAt}
          reopenEndsAt={reopenEndsAt}
          acting={acting}
          onReopenEndsAtChange={setReopenEndsAt}
          onReopen={() => void reopenOrder()}
        />
      ) : null}

      {tab === "app" ? (
        <PairingQrCard
          orderId={order.id}
          status={order.status}
          onOrderActivated={() => void load()}
        />
      ) : null}

      {tab === "testes" && order.isSimulation !== false ? (
        order.status === "CLOSED" ? (
          <p className="rounded-xl bg-white px-4 py-5 text-sm text-[#6B7280]">
            Reabra a medida para usar o simulador.
          </p>
        ) : (
          <InmateLocationSimulator
            orderId={order.id}
            radiusMeters={order.radiusMeters}
          />
        )
      ) : null}

      {tab === "cadastro" ? (
        order.status !== "CLOSED" ? (
          <div className="rounded-xl bg-white p-5">
            <ProtectionOrderForm
              mode="edit"
              orderId={order.id}
              initialValues={{
                victimId: order.victimId,
                inmateId: order.inmateId,
                radiusMeters: order.radiusMeters,
                isSimulation: order.isSimulation !== false,
                judicialRef: order.judicialRef,
                startsAt: order.startsAt,
                endsAt: order.endsAt,
                victim: order.victim,
                inmate: order.inmate,
              }}
              onSuccess={() => void load()}
            />
          </div>
        ) : (
          <p className="rounded-xl bg-white px-4 py-5 text-sm text-[#6B7280]">
            Reabra a medida para editar o cadastro.
          </p>
        )
      ) : null}
    </div>
  );
}

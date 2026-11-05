"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

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

export type PersonDetailField = {
  label: string;
  value: string;
};

export type PersonDetailOrder = {
  id: string;
  publicId: string;
  judicialRef: string | null;
  status: string;
  radiusMeters: number;
  watchRadiusMeters: number;
  createdAt: string;
  counterpartName: string | null;
  counterpartRole: string;
};

type PersonDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  fields: PersonDetailField[];
  loading: boolean;
  error: string | null;
  address: string | null;
  orders: PersonDetailOrder[];
  ordersTotal: number;
  onEdit: () => void;
};

export function PersonDetailDialog({
  open,
  onOpenChange,
  name,
  description,
  fields,
  loading,
  error,
  address,
  orders,
  ordersTotal,
  onEdit,
}: PersonDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
                  {field.label}
                </dt>
                <dd className="mt-1 text-sm text-[#1B2A41]">{field.value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
              Endereço
            </h2>
            {loading ? (
              <p className="mt-1 text-sm text-[#6B7280]">Carregando…</p>
            ) : error ? (
              <p className="mt-1 text-sm text-destructive">{error}</p>
            ) : (
              <p className="mt-1 text-sm text-[#1B2A41]">{address}</p>
            )}
          </section>

          <section>
            <h2 className="text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
              Medidas vinculadas
            </h2>
            {loading ? (
              <p className="mt-1 text-sm text-[#6B7280]">Carregando…</p>
            ) : error ? null : orders.length === 0 ? (
              <p className="mt-1 text-sm text-[#6B7280]">Nenhuma medida vinculada.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/medidas-protetivas/${order.id}`}
                      className="ampara-order-link flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2.5"
                    >
                      <span className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                        <span>
                          <span className="block text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
                            Processo
                          </span>
                          <span className="mt-0.5 block text-sm font-medium text-[#1B2A41]">
                            {order.judicialRef || order.publicId}
                          </span>
                        </span>
                        <span>
                          <span className="block text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
                            Raio de Violação
                          </span>
                          <span className="mt-0.5 block text-sm font-medium text-[#1B2A41]">
                            {order.radiusMeters} m
                          </span>
                        </span>
                        <span>
                          <span className="block text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
                            Raios de Atenção
                          </span>
                          <span className="mt-0.5 block text-sm font-medium text-[#1B2A41]">
                            {order.watchRadiusMeters} m
                          </span>
                        </span>
                      </span>
                      <ProtectionOrderStatusBadge status={order.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!loading && !error && ordersTotal > orders.length ? (
              <p className="mt-2 text-xs text-[#6B7280]">
                Mostrando as {orders.length} mais recentes de {ordersTotal}.
              </p>
            ) : null}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onEdit} disabled={loading || Boolean(error)}>
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { DayField } from "@/components/layout/list-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/format";
import { toDateInputValue } from "@/lib/vigencia-day";

type ReopenOrderControlProps = {
  orderId: string;
  endsAt: string | null;
  onReopened: (order: unknown) => void;
  context?: "default" | "pairing";
};

export function ReopenOrderControl({
  orderId,
  endsAt,
  onReopened,
  context = "default",
}: ReopenOrderControlProps) {
  const [reopenEndsAt, setReopenEndsAt] = useState(() =>
    toDateInputValue(endsAt),
  );
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReopenEndsAt(toDateInputValue(endsAt));
  }, [orderId, endsAt]);

  async function reopen() {
    if (!reopenEndsAt.trim()) {
      setError("Informe o novo prazo de término");
      return;
    }

    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/protection-orders/${orderId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endsAt: reopenEndsAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível reabrir a medida",
        );
        return;
      }
      onReopened(data);
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ReopenOrderPanel
        endsAt={endsAt}
        reopenEndsAt={reopenEndsAt}
        acting={acting}
        context={context}
        onReopenEndsAtChange={setReopenEndsAt}
        onReopen={() => void reopen()}
      />
    </div>
  );
}

type ReopenOrderPanelProps = {
  endsAt: string | null;
  reopenEndsAt: string;
  acting: boolean;
  context?: "default" | "pairing";
  onReopenEndsAtChange: (value: string) => void;
  onReopen: () => void;
};

export function ReopenOrderPanel({
  endsAt,
  reopenEndsAt,
  acting,
  context = "default",
  onReopenEndsAtChange,
  onReopen,
}: ReopenOrderPanelProps) {
  const pairing = context === "pairing";
  const when = endsAt ? formatDay(endsAt) : null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] p-5">
      <p className="text-sm font-semibold text-[#1B2A41]">
        {pairing ? "Pareamento indisponível" : "Medida encerrada"}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#4B5563]">
        {pairing
          ? `Esta medida está encerrada${when ? ` desde ${when}` : ""}. O aparelho da vítima só pode ser pareado depois da reabertura. Escolha o novo término para reativar a medida.`
          : `Encerrada${when ? ` em ${when}` : ""}. Escolha o novo término para reabrir.`}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1.5 sm:max-w-xs">
          <Label htmlFor="reopenEndsAt">Novo término</Label>
          <DayField
            id="reopenEndsAt"
            label="Novo término"
            value={reopenEndsAt}
            onChange={onReopenEndsAtChange}
            disabled={acting}
          />
        </div>
        <Button
          type="button"
          disabled={acting}
          className="ampara-create h-10 cursor-pointer"
          onClick={onReopen}
        >
          {acting ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : null}
          Reabrir medida
        </Button>
      </div>
    </div>
  );
}

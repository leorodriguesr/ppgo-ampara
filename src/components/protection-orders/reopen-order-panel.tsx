"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

type ReopenOrderPanelProps = {
  endsAt: string | null;
  reopenEndsAt: string;
  acting: boolean;
  onReopenEndsAtChange: (value: string) => void;
  onReopen: () => void;
};

export function ReopenOrderPanel({
  endsAt,
  reopenEndsAt,
  acting,
  onReopenEndsAtChange,
  onReopen,
}: ReopenOrderPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5">
      <p className="text-sm font-semibold text-[#1B2A41]">
        Medida encerrada
      </p>
      <p className="text-sm leading-6 text-[#4B5563]">
        Encerrada
        {endsAt ? ` em ${formatDateTime(endsAt)}` : ""}. O celular da vítima
        fica pausado até você informar um novo prazo e reabrir.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="reopenEndsAt">Novo prazo de término</Label>
          <Input
            id="reopenEndsAt"
            type="datetime-local"
            value={reopenEndsAt}
            onChange={(e) => onReopenEndsAtChange(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={acting}
          className="cursor-pointer bg-[#1B2A41] text-white hover:bg-[#24364f]"
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

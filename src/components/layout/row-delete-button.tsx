"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type RowDeleteButtonProps = {
  label: string;
  confirmMessage: string;
  onDelete: () => Promise<void>;
};

export function RowDeleteButton({
  label,
  confirmMessage,
  onDelete,
}: RowDeleteButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      disabled={busy}
      aria-label={label}
      title={label}
      className="text-[#9CA3AF] hover:bg-transparent hover:text-[#B45353]"
      onClick={(event) => void handleClick(event)}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Trash2 className="size-3.5" strokeWidth={1.75} />
    </Button>
  );
}

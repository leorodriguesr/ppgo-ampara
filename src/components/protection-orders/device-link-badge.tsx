"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { DeviceLink } from "@/services/proximity-policy";

const DEVICE_LINK_COPY: Record<
  DeviceLink,
  { label: string; hint: string; className: string }
> = {
  paired: {
    label: "Pareado",
    hint: "O celular está vinculado e enviando contato e posição recentes. O monitoramento está em dia.",
    className: "text-[#166534] dark:text-[#86EFAC]",
  },
  unpaired: {
    label: "Despareado",
    hint: "Nenhum celular está vinculado a esta medida. O acesso do app foi cancelado.",
    className: "text-[#92400E] dark:text-[#FCD34D]",
  },
  no_signal: {
    label: "Sem sinal",
    hint: "O celular está pareado, mas parou de falar com o sistema. A última posição conhecida não gera alerta.",
    className: "text-[#991B1B] dark:text-[#FCA5A5]",
  },
  no_position: {
    label: "Sem posição",
    hint: "O celular responde, mas não envia uma coordenada recente. Sem GPS atual, nenhum alerta novo é gerado.",
    className: "text-[#991B1B] dark:text-[#FCA5A5]",
  },
  no_background: {
    label: "Sem segundo plano",
    hint: "O celular responde, mas a localização com a tela bloqueada está negada. O monitoramento pode parar quando o app fecha.",
    className: "text-[#92400E] dark:text-[#FCD34D]",
  },
};

const DEVICE_LINK_ORDER: DeviceLink[] = [
  "paired",
  "unpaired",
  "no_signal",
  "no_position",
  "no_background",
];

export function DeviceLinkBadge({ link }: { link: DeviceLink | null }) {
  if (!link) return <span className="text-[#9CA3AF]">—</span>;

  const copy = DEVICE_LINK_COPY[link];
  return <span className={`font-medium ${copy.className}`}>{copy.label}</span>;
}

export function DeviceLinkColumnInfo() {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 320;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    setBox({ top: rect.bottom + 6, left });
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!pinned) setOpen(false);
    }, 120);
  }

  useEffect(() => {
    if (!pinned) return;
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target)) return;
      if (tipRef.current?.contains(target)) return;
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pinned]);

  useEffect(() => () => cancelClose(), []);

  const visible = open || pinned;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="O que significa cada status do aparelho"
        aria-describedby={visible ? tipId : undefined}
        className="inline-flex cursor-pointer text-current/80 hover:text-current"
        onMouseEnter={() => {
          cancelClose();
          place();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          place();
          setOpen(true);
        }}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        onClick={() => {
          place();
          setPinned((value) => !value);
          setOpen(true);
        }}
      >
        <Info className="size-3.5" strokeWidth={1.75} />
      </button>
      {visible && box
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              role="tooltip"
              style={{ top: box.top, left: box.left }}
              className="fixed z-50 w-80 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-left text-xs leading-relaxed font-normal whitespace-normal text-[#1B2A41] shadow-lg dark:border-white/10 dark:bg-[#1B2433] dark:text-white"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <ul className="space-y-2">
                {DEVICE_LINK_ORDER.map((key) => {
                  const copy = DEVICE_LINK_COPY[key];
                  return (
                    <li key={key}>
                      <span className={`font-medium ${copy.className}`}>
                        {copy.label}.
                      </span>{" "}
                      {copy.hint}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

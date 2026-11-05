"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );
  const selected = options.find((option) => option.value === value) ?? null;
  const filtered = options.filter((option) => fold(option.label).includes(fold(query.trim())));

  function close() {
    setOpen(false);
    setQuery("");
  }

  function placePanel() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPlace({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <input
          id={id}
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar"
          aria-expanded
          aria-controls={listId}
          role="combobox"
          className="h-10 w-full rounded-md border border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] outline-none placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]"
        />
      ) : (
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-expanded={false}
          aria-controls={listId}
          role="combobox"
          className="inline-flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-[#D8DEE6] bg-white px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            placePanel();
            setOpen(true);
          }}
        >
          <span className={cn("truncate", selected ? "text-[#1B2A41]" : "text-[#9CA3AF]")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}
      {open && place
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="listbox"
              className="fixed z-[2200] max-h-56 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-[0_12px_32px_rgba(27,42,65,0.12)]"
              style={{ left: place.left, top: place.top, width: place.width }}
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      "block w-full cursor-pointer px-3 py-2 text-left text-sm text-foreground hover:bg-accent",
                      option.value === value && "bg-accent",
                    )}
                    onClick={() => {
                      onChange(option.value);
                      close();
                    }}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

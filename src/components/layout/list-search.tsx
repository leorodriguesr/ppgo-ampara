"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function parseDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(parseDay(value))
    .replace(".", "");
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function MonthDays({
  month,
  from,
  to,
  onPick,
  onPointerDownDay,
  onPointerEnterDay,
}: {
  month: Date;
  from: Date | null;
  to: Date | null;
  onPick?: (day: Date) => void;
  onPointerDownDay?: (day: Date) => void;
  onPointerEnterDay?: (day: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const today = startOfDay(new Date());
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, index) => new Date(year, monthIndex, index + 1)),
  ];

  return (
    <div className="w-[16.5rem]">
      <p className="mb-2 text-center text-sm font-medium text-foreground">{monthLabel(month)}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((weekday, index) => (
          <span key={`${weekday}-${index}`} className="py-1 text-[10px] font-medium text-muted-foreground">
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const selected = (from && sameDay(day, from)) || (to && sameDay(day, to));
          const inRange =
            from &&
            to &&
            startOfDay(day) > startOfDay(from) &&
            startOfDay(day) < startOfDay(to);
          const isToday = sameDay(day, today);
          return (
            <button
              key={toDay(day)}
              type="button"
              className={cn(
                "mx-auto grid size-8 cursor-pointer place-items-center rounded-full text-sm text-foreground select-none",
                inRange && "bg-accent",
                selected && "bg-foreground text-background",
                !selected && "hover:bg-accent",
                isToday && !selected && "ring-1 ring-border",
              )}
              onClick={() => onPick?.(day)}
              onPointerDown={(event) => {
                if (!onPointerDownDay) return;
                event.preventDefault();
                onPointerDownDay(day);
              }}
              onPointerEnter={() => onPointerEnterDay?.(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPanel({
  month,
  onMonth,
  from,
  to,
  onPick,
}: {
  month: Date;
  onMonth: (next: Date) => void;
  from: Date | null;
  to: Date | null;
  onPick: (day: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-[0_12px_32px_rgba(27,42,65,0.12)]">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onMonth(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onMonth(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <MonthDays month={month} from={from} to={to} onPick={onPick} />
    </div>
  );
}

function useDismiss(
  open: boolean,
  close: () => void,
  extra?: RefObject<HTMLElement | null>,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || extra?.current?.contains(target)) return;
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
  }, [open, close, extra]);

  return ref;
}

export function ListSearch({
  onSubmit,
  children,
}: {
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex h-10 w-full items-stretch overflow-visible rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(27,42,65,0.05)] lg:max-w-[70%] dark:shadow-none"
    >
      {children}
    </form>
  );
}

export function ListSearchField({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#1565A8] dark:text-[#8EC4EF]" />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-full rounded-none border-0 bg-transparent pr-3 pl-9 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}

export function ListSearchSubmit() {
  return (
    <Button
      type="submit"
      aria-label="Pesquisar"
      title="Pesquisar"
      className="h-full cursor-pointer rounded-none rounded-r-xl bg-[#1565A8] px-4 text-sm text-white hover:bg-[#115488] dark:bg-[#1565A8] dark:text-white dark:hover:bg-[#1B78C2]"
    >
      <Search className="size-4" />
    </Button>
  );
}

export function SearchDateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDay(value));
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative flex self-stretch">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex h-full cursor-pointer items-center gap-2 border-l border-border px-3 text-sm text-foreground hover:bg-accent"
        onClick={() => {
          setMonth(parseDay(value));
          setOpen((current) => !current);
        }}
      >
        <Calendar className="size-3.5 text-[#8A6A08] dark:text-[#F0D36A]" />
        <span className="whitespace-nowrap tabular-nums">{formatDayLabel(value)}</span>
      </button>
      {open ? (
        <div id={panelId} className="absolute top-[calc(100%+0.5rem)] right-0 z-30">
          <CalendarPanel
            month={month}
            onMonth={setMonth}
            from={parseDay(value)}
            to={null}
            onPick={(day) => {
              onChange(toDay(day));
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DayField({
  id,
  value,
  onChange,
  label,
  placeholder = "Selecione",
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDay(value));
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(
    null,
  );
  const close = () => setOpen(false);
  const ref = useDismiss(open, close, panelRef);
  const hasValue = /^\d{4}-\d{2}-\d{2}$/.test(value);

  function placePanel() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 280;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 260 && rect.top > spaceBelow) {
      setPlace({ left, bottom: window.innerHeight - rect.top + 8 });
      return;
    }
    setPlace({ left, top: rect.bottom + 8 });
  }

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        className="inline-flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setMonth(parseDay(value));
          placePanel();
          setOpen((current) => !current);
        }}
      >
        <Calendar className="size-3.5 shrink-0 text-[#9CA3AF]" />
        <span className={cn("truncate tabular-nums", !hasValue && "text-[#9CA3AF]")}>
          {hasValue ? formatDayLabel(value) : placeholder}
        </span>
      </button>
      {open && place
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              className="fixed z-[2200]"
              style={{ left: place.left, top: place.top, bottom: place.bottom }}
            >
              <CalendarPanel
                month={month}
                onMonth={setMonth}
                from={hasValue ? parseDay(value) : null}
                to={null}
                onPick={(day) => {
                  onChange(toDay(day));
                  setOpen(false);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function orderDays(a: string, b: string) {
  return a <= b ? ([a, b] as const) : ([b, a] as const);
}

export function SearchDateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const panelId = useId();
  const [edge, setEdge] = useState<"from" | "to" | null>(null);
  const [month, setMonth] = useState(() => parseDay(from));
  const [draft, setDraft] = useState<{ from: string; to: string } | null>(null);
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const dragAnchor = useRef<string | null>(null);
  const draftRef = useRef<{ from: string; to: string } | null>(null);
  const moved = useRef(false);
  const close = () => {
    dragAnchor.current = null;
    moved.current = false;
    draftRef.current = null;
    setDraft(null);
    setAwaitingEnd(false);
    setEdge(null);
  };
  const ref = useDismiss(edge !== null, close);
  const shownFrom = draft?.from ?? from;
  const shownTo = draft?.to ?? to;
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  useEffect(() => {
    if (!edge) return;
    function onUp() {
      const anchor = dragAnchor.current;
      const current = draftRef.current;
      dragAnchor.current = null;
      if (!anchor || !current) return;
      if (moved.current) {
        onChange(current.from, current.to);
        moved.current = false;
        draftRef.current = null;
        setDraft(null);
        setAwaitingEnd(false);
        setEdge(null);
        return;
      }
      if (edge === "from" && !awaitingEnd) {
        onChange(anchor, anchor > to ? anchor : to);
        moved.current = false;
        draftRef.current = null;
        setDraft(null);
        setAwaitingEnd(true);
        return;
      }
      if (edge === "from") {
        const [nextFrom, nextTo] = orderDays(from, anchor);
        onChange(nextFrom, nextTo);
      } else {
        onChange(anchor < from ? anchor : from, anchor < from ? from : anchor);
      }
      moved.current = false;
      draftRef.current = null;
      setDraft(null);
      setAwaitingEnd(false);
      setEdge(null);
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [edge, from, to, onChange, awaitingEnd]);

  function remember(next: { from: string; to: string }) {
    draftRef.current = next;
    setDraft(next);
  }

  function pressDay(day: Date) {
    const value = toDay(day);
    dragAnchor.current = value;
    moved.current = false;
    remember({ from: value, to: value });
  }

  function dragDay(day: Date) {
    const anchor = dragAnchor.current;
    if (!anchor) return;
    const value = toDay(day);
    if (value === anchor) return;
    moved.current = true;
    const [nextFrom, nextTo] = orderDays(anchor, value);
    remember({ from: nextFrom, to: nextTo });
  }

  function openEdge(next: "from" | "to") {
    setAwaitingEnd(false);
    setMonth(parseDay(next === "from" ? from : to));
    setEdge((current) => (current === next ? null : next));
  }

  return (
    <div ref={ref} className="relative flex self-stretch">
      <button
        type="button"
        aria-label="Data inicial"
        aria-expanded={edge === "from"}
        aria-controls={panelId}
        className="inline-flex h-full cursor-pointer items-center gap-2 border-l border-border px-3 text-sm text-foreground hover:bg-accent"
        onClick={() => openEdge("from")}
      >
        <Calendar className="size-3.5 text-[#8A6A08] dark:text-[#F0D36A]" />
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          De
        </span>
        <span className="whitespace-nowrap tabular-nums">{formatDayLabel(from)}</span>
      </button>
      <button
        type="button"
        aria-label="Data final"
        aria-expanded={edge === "to"}
        aria-controls={panelId}
        className="inline-flex h-full cursor-pointer items-center gap-2 border-l border-border px-3 text-sm text-foreground hover:bg-accent"
        onClick={() => openEdge("to")}
      >
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Até
        </span>
        <span className="whitespace-nowrap tabular-nums">{formatDayLabel(to)}</span>
      </button>
      {edge ? (
        <div id={panelId} className="absolute top-[calc(100%+0.5rem)] right-0 z-30">
          <div className="rounded-xl border border-border bg-popover p-3 shadow-[0_12px_32px_rgba(27,42,65,0.12)]">
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                aria-label="Meses anteriores"
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Próximos meses"
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <MonthDays
                month={month}
                from={parseDay(shownFrom)}
                to={parseDay(shownTo)}
                onPointerDownDay={pressDay}
                onPointerEnterDay={dragDay}
              />
              <MonthDays
                month={nextMonth}
                from={parseDay(shownFrom)}
                to={parseDay(shownTo)}
                onPointerDownDay={pressDay}
                onPointerEnterDay={dragDay}
              />
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {edge === "from" && awaitingEnd
                ? "Agora escolha a data de Até. Você pode avançar os meses."
                : edge === "from"
                  ? "Escolha a data de De e depois a de Até, ou arraste o período."
                  : "Escolha a data de Até."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

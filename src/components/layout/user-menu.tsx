"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";

import { ROLE_LABELS, type AppRole } from "@/lib/rbac";
import { useAuth } from "@/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  name: string;
  email: string;
  role: AppRole;
  variant?: "default" | "sidebar";
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarUserMenu({ name }: { name: string }) {
  const { requestLogout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-full rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-md dark:border-white/10 dark:bg-[#262626]">
          <button
            type="button"
            onClick={requestLogout}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[#1B2A41] hover:bg-[#F3F4F6] dark:text-white dark:hover:bg-white/8"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-2 py-2 text-left outline-none hover:bg-[#F3F4F6] focus-visible:ring-2 focus-visible:ring-[#C5CDD6] dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/8 dark:focus-visible:ring-white/20"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-[#1B2A41]/10 text-xs text-[#1B2A41] dark:bg-white/10 dark:text-white">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight text-[#1B2A41] dark:text-white">
          {name}
        </span>
      </button>
    </div>
  );
}

export function UserMenu({
  name,
  email,
  role,
  variant = "default",
}: UserMenuProps) {
  const { requestLogout } = useAuth();

  if (variant === "sidebar") {
    return <SidebarUserMenu name={name} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-auto cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          <span className="block text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground">{name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={requestLogout}>
          <LogOut className="size-4" />
          Sair (SSO)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

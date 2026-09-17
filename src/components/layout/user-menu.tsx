"use client";

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

export function UserMenu({
  name,
  email,
  role,
  variant = "default",
}: UserMenuProps) {
  const { requestLogout } = useAuth();
  const sidebar = variant === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          sidebar
            ? "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
            : "inline-flex h-auto items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        <Avatar className="size-8">
          <AvatarFallback
            className={sidebar ? "bg-white/15 text-white text-xs" : undefined}
          >
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className={sidebar ? "min-w-0 flex-1" : "hidden text-left sm:block"}>
          <span
            className={
              sidebar
                ? "block truncate text-[13px] font-medium leading-tight text-white"
                : "block text-sm font-medium leading-tight"
            }
          >
            {name}
          </span>
          <span
            className={
              sidebar
                ? "block truncate text-[11px] text-white/55"
                : "block text-xs text-muted-foreground"
            }
          >
            {ROLE_LABELS[role]}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={sidebar ? "start" : "end"} className="min-w-56">
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

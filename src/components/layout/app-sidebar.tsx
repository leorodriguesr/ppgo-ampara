"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/config/sistema";
import type { AppRole } from "@/lib/rbac";

type AppSidebarProps = {
  role: AppRole;
  user: {
    name: string;
    email: string;
    role: AppRole;
  };
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
      <PoliciaPenalMark size={40} />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-white">
          {APP_NAME}
        </p>
        <p className="text-[11px] text-white/55">Polícia Penal de Goiás</p>
      </div>
    </div>
  );
}

function SidebarBody({
  role,
  user,
  onNavigate,
}: AppSidebarProps & { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <SidebarNav role={role} onNavigate={onNavigate} />
      <div className="mt-auto border-t border-white/10 p-3">
        <UserMenu
          name={user.name}
          email={user.email}
          role={user.role}
          variant="sidebar"
        />
      </div>
    </>
  );
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-60 shrink-0 bg-[#1B2A41] md:flex md:flex-col">
        <SidebarBody role={role} user={user} />
      </aside>

      <div className="flex items-center gap-2 bg-[#1B2A41] px-3 py-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menu"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              />
            }
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#1B2A41] p-0 text-white">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegação</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <SidebarBody
                role={role}
                user={user}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <PoliciaPenalMark size={32} />
          <span className="text-sm font-semibold text-white">{APP_NAME}</span>
        </div>
      </div>
    </>
  );
}

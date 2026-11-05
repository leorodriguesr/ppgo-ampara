"use client";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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

const shellClass =
  "relative flex h-full min-h-0 flex-col overflow-hidden border-r border-[#E2E5EA] bg-white text-[#1B2A41] dark:border-transparent dark:bg-[#262626] dark:text-white";

function ConsoleSurface() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(27,42,65,0.035), transparent 32%), linear-gradient(rgba(27,42,65,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(27,42,65,0.055) 1px, transparent 1px)",
          backgroundSize: "auto, 22px 22px, 22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 32%), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "auto, 22px 22px, 22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-linear-to-b from-white/0 via-white/25 to-white/0 dark:block"
      />
    </>
  );
}

function Brand() {
  return (
    <div className="relative z-10 px-5 pt-6 pb-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#FBF3D4] p-1 ring-1 ring-[#E3B106]/40 dark:bg-[#E3B106]/10 dark:ring-[#E3B106]/30">
          <PoliciaPenalMark size={40} />
        </div>
        <div className="leading-tight">
          <p className="font-mono text-[10px] tracking-[0.28em] text-[#6B7280] dark:text-white/45">
            PPGO
          </p>
          <p className="text-[15px] font-semibold tracking-[0.16em]">
            {APP_NAME}
          </p>
        </div>
      </div>
      <div className="mt-4 h-0.5 w-12 rounded-full bg-[#E3B106]" />
    </div>
  );
}

export function SidebarBody({
  role,
  user,
  onNavigate,
}: AppSidebarProps & { onNavigate?: (href: string) => void }) {
  return (
    <div className={shellClass}>
      <ConsoleSurface />
      <Brand />
      <SidebarNav role={role} onNavigate={onNavigate} />
      <div className="relative z-10 mt-auto border-t border-[#E5E7EB] p-3 dark:border-white/10">
        <ThemeToggle variant="sidebar" />
        <UserMenu
          name={user.name}
          email={user.email}
          role={user.role}
          variant="sidebar"
        />
      </div>
    </div>
  );
}

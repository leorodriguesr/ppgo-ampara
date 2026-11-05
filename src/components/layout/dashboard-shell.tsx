"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { RequireAuth } from "@/components/auth/require-auth";
import { SidebarBody } from "@/components/layout/app-sidebar";
import { MapChromeProvider } from "@/components/layout/map-chrome";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { APP_NAME } from "@/config/sistema";
import { isAppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type DashboardShellProps = {
  children: React.ReactNode;
};

function isMapPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/acompanhamento/");
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { authData } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = authData.user;

  const isMap = isMapPath(pathname);

  useEffect(() => {
    if (!isMap) setMenuOpen(false);
  }, [isMap]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!user) return null;

  const role = isAppRole(user.role) ? user.role : "POLICE";

  function handleNavigate(href: string) {
    const toMap = isMapPath(href);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (toMap || mobile) setMenuOpen(false);
  }

  return (
    <MapChromeProvider openMenu={() => setMenuOpen(true)}>
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-[2000] bg-black/45 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          !isMap && "md:hidden",
        )}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        inert={isMap && !menuOpen ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-[2001] flex h-svh w-72 flex-col transition-transform duration-300 ease-out motion-reduce:transition-none",
          menuOpen ? "translate-x-0" : "-translate-x-full",
          !menuOpen && !isMap && "md:translate-x-0",
          !menuOpen && isMap && "pointer-events-none",
          !menuOpen && !isMap && "max-md:pointer-events-none",
        )}
      >
        <SidebarBody
          role={role}
          user={{ name: user.name, email: user.email, role }}
          onNavigate={handleNavigate}
        />
      </aside>

      <div
        className={
          isMap
            ? "h-svh overflow-hidden bg-[#E8EAED] dark:bg-[#262626]"
            : "min-h-svh bg-[#F3F4F6] md:pl-72"
        }
      >
        {isMap ? (
          children
        ) : (
          <>
            <div className="relative flex items-center gap-2 overflow-hidden border-b border-[#E5E7EB] bg-white px-3 py-2 md:hidden dark:border-transparent dark:bg-[#262626]">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMenuOpen(true)}
                className="grid size-9 place-items-center rounded-md border border-[#D8DEE6] text-[#1B2A41] hover:bg-[#F3F4F6] dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              >
                <Menu className="size-4" />
              </button>
              <PoliciaPenalMark size={32} />
              <span className="truncate text-sm font-semibold tracking-[0.14em] text-[#1B2A41] dark:text-white">
                {APP_NAME}
              </span>
              <span className="ml-auto">
                <ThemeToggle variant="bar" />
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-[#6B7280] dark:text-white/50">
                <span className="size-1.5 rounded-full bg-[#E3B106]" />
                LIVE
              </span>
            </div>
            <main className="min-h-svh min-w-0 border-l border-[#E2E5EA] bg-white px-5 py-5 md:px-6">
              {children}
            </main>
          </>
        )}
      </div>
    </MapChromeProvider>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <RequireAuth>
      <DashboardFrame>{children}</DashboardFrame>
    </RequireAuth>
  );
}

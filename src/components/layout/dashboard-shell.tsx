"use client";

import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { RequireAuth } from "@/components/auth/require-auth";
import { isAppRole } from "@/lib/rbac";
import { useAuth } from "@/providers/auth-provider";

type DashboardShellProps = {
  children: React.ReactNode;
};

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { authData } = useAuth();
  const pathname = usePathname();
  const user = authData.user;

  if (!user) return null;

  const role = isAppRole(user.role) ? user.role : "POLICE";
  const isBoard = pathname === "/";

  return (
    <div className="flex min-h-svh bg-[#F3F4F6]">
      <AppSidebar
        role={role}
        user={{
          name: user.name,
          email: user.email,
          role,
        }}
      />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <main
          className={
            isBoard
              ? "min-h-0 flex-1"
              : "flex-1 px-4 py-6 md:px-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <RequireAuth>
      <DashboardFrame>{children}</DashboardFrame>
    </RequireAuth>
  );
}

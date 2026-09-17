"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Scale,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/rbac";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Painel Geral", icon: LayoutDashboard },
  { href: "/victims", label: "Vítimas", icon: UserRound },
  { href: "/inmates", label: "Presos", icon: Users },
  { href: "/protection-orders", label: "Medidas protetivas", icon: Scale },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/audit", label: "Auditoria", icon: ClipboardList, roles: ["ADMIN"] },
];

type SidebarNavProps = {
  role: AppRole;
  onNavigate?: () => void;
};

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
              active
                ? "bg-white/12 font-medium text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

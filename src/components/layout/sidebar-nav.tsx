"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Route,
  Scale,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/rbac";

type NavTone = "blue" | "gold" | "green" | "rose" | "indigo" | "bronze" | "teal" | "violet";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: NavTone;
  roles?: AppRole[];
};

const TONE: Record<
  NavTone,
  { row: string; chip: string; chipActive: string; bar: string }
> = {
  blue: {
    row: "bg-[#1565A8]/8 dark:bg-[#1565A8]/15",
    chip: "bg-[#E5F1FA] text-[#1565A8] ring-[#1565A8]/15 group-hover:bg-[#D7E9F6] dark:bg-[#1565A8]/20 dark:text-[#8EC4EF] dark:ring-[#8EC4EF]/25",
    chipActive:
      "bg-[#1565A8] text-white ring-[#1565A8] dark:bg-[#1565A8] dark:text-white dark:ring-[#8EC4EF]/40",
    bar: "bg-[#1565A8]",
  },
  gold: {
    row: "bg-[#E3B106]/14 dark:bg-[#E3B106]/12",
    chip: "bg-[#FBF3D4] text-[#8A6A08] ring-[#E3B106]/35 group-hover:bg-[#F7EAB4] dark:bg-[#E3B106]/15 dark:text-[#F0D36A] dark:ring-[#E3B106]/30",
    chipActive:
      "bg-[#E3B106] text-[#18263C] ring-[#C99704] dark:bg-[#E3B106] dark:text-[#18263C] dark:ring-[#F0D36A]/50",
    bar: "bg-[#E3B106]",
  },
  green: {
    row: "bg-[#1B7A4A]/8 dark:bg-[#1B7A4A]/15",
    chip: "bg-[#E5F6EC] text-[#1B7A4A] ring-[#1B7A4A]/15 group-hover:bg-[#D5F0E0] dark:bg-[#1B7A4A]/20 dark:text-[#8ED4A8] dark:ring-[#8ED4A8]/25",
    chipActive:
      "bg-[#1B7A4A] text-white ring-[#1B7A4A] dark:bg-[#1B7A4A] dark:text-white dark:ring-[#8ED4A8]/40",
    bar: "bg-[#1B7A4A]",
  },
  rose: {
    row: "bg-[#B4536A]/8 dark:bg-[#B4536A]/15",
    chip: "bg-[#FBE8ED] text-[#B4536A] ring-[#B4536A]/15 group-hover:bg-[#F6D5DE] dark:bg-[#B4536A]/20 dark:text-[#F0A8B8] dark:ring-[#F0A8B8]/25",
    chipActive:
      "bg-[#B4536A] text-white ring-[#B4536A] dark:bg-[#B4536A] dark:text-white dark:ring-[#F0A8B8]/40",
    bar: "bg-[#B4536A]",
  },
  indigo: {
    row: "bg-[#3A4A8A]/8 dark:bg-[#3A4A8A]/20",
    chip: "bg-[#E8EAF6] text-[#3A4A8A] ring-[#3A4A8A]/15 group-hover:bg-[#DDE1F3] dark:bg-[#3A4A8A]/25 dark:text-[#B7C0E8] dark:ring-[#B7C0E8]/25",
    chipActive:
      "bg-[#3A4A8A] text-white ring-[#3A4A8A] dark:bg-[#4C5EA3] dark:text-white dark:ring-[#B7C0E8]/40",
    bar: "bg-[#3A4A8A]",
  },
  bronze: {
    row: "bg-[#8A5A2B]/8 dark:bg-[#8A5A2B]/15",
    chip: "bg-[#F6EEE4] text-[#8A5A2B] ring-[#8A5A2B]/15 group-hover:bg-[#F0E2D0] dark:bg-[#8A5A2B]/20 dark:text-[#E2C09A] dark:ring-[#E2C09A]/25",
    chipActive:
      "bg-[#8A5A2B] text-white ring-[#8A5A2B] dark:bg-[#8A5A2B] dark:text-white dark:ring-[#E2C09A]/40",
    bar: "bg-[#8A5A2B]",
  },
  teal: {
    row: "bg-[#0F766E]/8 dark:bg-[#0F766E]/15",
    chip: "bg-[#E6F6F4] text-[#0F766E] ring-[#0F766E]/15 group-hover:bg-[#D3EFEB] dark:bg-[#0F766E]/20 dark:text-[#7DCDC4] dark:ring-[#7DCDC4]/25",
    chipActive:
      "bg-[#0F766E] text-white ring-[#0F766E] dark:bg-[#0F766E] dark:text-white dark:ring-[#7DCDC4]/40",
    bar: "bg-[#0F766E]",
  },
  violet: {
    row: "bg-[#6E5F8A]/8 dark:bg-[#6E5F8A]/16",
    chip: "bg-[#F4F0F8] text-[#5A4C74] ring-[#6E5F8A]/15 group-hover:bg-[#E9E3F1] dark:bg-[#6E5F8A]/20 dark:text-[#C9BFD6] dark:ring-[#C9BFD6]/25",
    chipActive:
      "bg-[#6E5F8A] text-white ring-[#6E5F8A] dark:bg-[#6E5F8A] dark:text-white dark:ring-[#C9BFD6]/40",
    bar: "bg-[#6E5F8A]",
  },
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "ops",
    label: "Operação",
    items: [
      { href: "/", label: "Acompanhamento", icon: LayoutDashboard, tone: "blue" },
      // { href: "/alerts", label: "Alertas", icon: Bell },
      { href: "/ocorrencias", label: "Ocorrências", icon: BookOpen, tone: "bronze" },
      { href: "/relatorios", label: "Relatórios", icon: Route, tone: "green" },
    ],
  },
  {
    id: "protection",
    label: "Cadastro",
    items: [
      { href: "/vitimas", label: "Vítimas", icon: UserRound, tone: "rose" },
      { href: "/presos", label: "Presos", icon: Users, tone: "indigo" },
      {
        href: "/medidas-protetivas",
        label: "Medidas protetivas",
        icon: Scale,
        tone: "violet",
      },
    ],
  },
  {
    id: "control",
    label: "Controle",
    items: [
      {
        href: "/audit",
        label: "Auditoria",
        icon: ClipboardList,
        tone: "bronze",
        roles: ["ADMIN"],
      },
    ],
  },
];

type SidebarNavProps = {
  role: AppRole;
  onNavigate?: (href: string) => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-2.5 pb-1.5 font-mono text-[10px] tracking-[0.22em] text-[#9CA3AF] uppercase dark:text-white/40">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              const tone = TONE[item.tone];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onNavigate?.(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all",
                    active
                      ? cn("text-[#1B2A41] dark:text-white", tone.row)
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1B2A41] dark:text-slate-300 dark:hover:bg-white/6 dark:hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-2 bottom-2 left-0 w-0.5 rounded-full transition-opacity",
                      tone.bar,
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md ring-1 transition-colors",
                      active ? tone.chipActive : tone.chip,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] leading-tight font-medium">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

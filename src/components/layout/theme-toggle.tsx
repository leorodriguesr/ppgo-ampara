"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/providers/theme-provider";

type ThemeToggleProps = {
  variant?: "icon" | "sidebar" | "bar";
};

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === "dark";
  const label = toLight ? "Tema claro" : "Tema escuro";
  const icon = toLight ? <Sun className="size-4" /> : <Moon className="size-4" />;

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1B2A41] dark:text-slate-300 dark:hover:bg-white/6 dark:hover:text-white"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#FBF3D4] text-[#8A6A08] ring-1 ring-[#E3B106]/35 dark:bg-[#E3B106]/15 dark:text-[#F0D36A] dark:ring-[#E3B106]/30">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  if (variant === "bar") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={toggleTheme}
        className="grid size-9 place-items-center rounded-md border border-[#D8DEE6] text-[#1B2A41] hover:bg-[#F3F4F6] dark:border-white/20 dark:text-white dark:hover:bg-white/10"
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleTheme}
      className="grid size-11 cursor-pointer place-items-center rounded-lg bg-white text-[#1B2A41] shadow-md ring-1 ring-[#D8DEE6] hover:bg-[#F4F6F8] dark:bg-[#262626] dark:text-white dark:ring-white/15 dark:hover:bg-[#303030]"
    >
      {toLight ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

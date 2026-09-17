import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type NativeSelectProps = ComponentProps<"select">;

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-[#D8DEE6] bg-white px-3 pr-8 text-sm text-[#1B2A41] outline-none focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[#6B7280]" />
    </div>
  );
}

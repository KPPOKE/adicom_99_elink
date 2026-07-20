import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      <select
        className="flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 pr-9 text-sm text-slate-100 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
    </span>
  );
}

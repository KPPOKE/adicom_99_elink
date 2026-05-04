import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100",
        className
      )}
      {...props}
    />
  );
}

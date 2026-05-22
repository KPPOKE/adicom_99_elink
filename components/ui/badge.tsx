import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  slate: "border-slate-600 bg-slate-800/80 text-slate-300",
  blue: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  cyan: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
  orange: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  red: "border-red-500/30 bg-red-500/15 text-red-300",
  green: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
};

export function Badge({
  className,
  variant = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}

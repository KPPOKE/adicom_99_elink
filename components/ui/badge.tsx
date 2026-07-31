import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  slate: "border-slate-300 bg-slate-100 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export function Badge({
  className,
  variant = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-center text-xs font-medium leading-tight", variants[variant], className)}
      {...props}
    />
  );
}

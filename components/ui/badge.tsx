import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  cyan: "bg-cyan-100 text-cyan-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  green: "bg-emerald-100 text-emerald-700"
};

export function Badge({
  className,
  variant = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}

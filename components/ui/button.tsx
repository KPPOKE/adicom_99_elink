"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md hover:from-blue-500 hover:to-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]",
        secondary: "border border-slate-700 bg-slate-800/80 text-slate-100 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(148,163,184,0.1)]",
        accent: "bg-orange-500 text-white shadow-sm hover:bg-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]",
        outline: "border border-slate-700 bg-transparent text-slate-200 hover:border-blue-500/70 hover:bg-blue-500/10 hover:text-white",
        ghost: "text-slate-300 hover:bg-slate-800/60 hover:text-white",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

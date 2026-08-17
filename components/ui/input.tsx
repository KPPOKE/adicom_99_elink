"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onClick, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70",
        type === "date" || type === "time"
          ? "block min-h-[40px] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-1"
          : type === "file"
          ? "flex h-10 items-center py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          : "flex h-10 py-2",
        className
      )}
      ref={ref}
      onClick={(e) => {
        if (type === "date" || type === "time") {
          try {
            (e.target as HTMLInputElement).showPicker();
          } catch (err) {}
        }
        onClick?.(e);
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

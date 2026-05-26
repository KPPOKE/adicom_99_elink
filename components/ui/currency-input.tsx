"use client";

import React from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps extends Omit<NumericFormatProps, "value" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-slate-700 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={value === 0 && !(props as any).allowEmptyFormatting ? "" : value}
        onValueChange={(values) => {
          if (onChange) {
            onChange(values.floatValue ?? 0);
          }
        }}
        thousandSeparator={props.thousandSeparator ?? "."}
        decimalSeparator={props.decimalSeparator ?? ","}
        prefix={props.prefix ?? "Rp "}
        allowNegative={props.allowNegative ?? false}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

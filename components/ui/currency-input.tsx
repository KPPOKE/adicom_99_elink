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
          "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70",
          className
        )}
        value={value === 0 ? "" : value}
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

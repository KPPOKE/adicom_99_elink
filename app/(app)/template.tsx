"use client";

import { ReactNode } from "react";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in-up">
      {children}
    </div>
  );
}

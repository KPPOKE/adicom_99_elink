"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  title = "Hapus data?",
  description = "Aksi ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  tone = "danger",
  onConfirm,
  trigger
}: {
  title?: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "success";
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  const success = tone === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className={cn("mb-2 flex h-10 w-10 items-center justify-center rounded-lg border", success ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-300" : "border-red-500/25 bg-red-500/15 text-red-300")}>
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-slate-500">{description}</p>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant={success ? "default" : "destructive"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

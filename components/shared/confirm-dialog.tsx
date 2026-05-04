"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConfirmDialog({
  title = "Hapus data?",
  description = "Aksi ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  onConfirm,
  trigger
}: {
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-slate-500">{description}</p>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

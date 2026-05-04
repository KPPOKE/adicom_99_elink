import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <Inbox className="h-9 w-9 text-slate-300" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

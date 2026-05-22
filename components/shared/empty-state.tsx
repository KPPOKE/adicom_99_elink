import { Inbox } from "lucide-react";

export function EmptyState({ title, description, icon: Icon = Inbox }: { title: string; description?: string; icon?: React.ElementType }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center backdrop-blur-sm transition-all hover:bg-slate-900/50">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-slate-400 leading-relaxed">{description}</p> : null}
    </div>
  );
}

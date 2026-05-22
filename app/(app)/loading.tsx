export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-slate-800/60" />
          <div className="h-4 w-72 rounded-md bg-slate-800/40" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-slate-800/60" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-slate-800/50 bg-slate-900/40" />
        ))}
      </div>

      <div className="h-96 w-full rounded-xl border border-slate-800/50 bg-slate-900/40" />
    </div>
  );
}

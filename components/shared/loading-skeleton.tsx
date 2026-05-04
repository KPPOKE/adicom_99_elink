export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "blue",
  helper
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "orange" | "green" | "red" | "slate";
  helper?: string;
}) {
  const tones = {
    blue: "border-blue-500/25 bg-blue-500/15 text-blue-300",
    cyan: "border-cyan-500/25 bg-cyan-500/15 text-cyan-300",
    orange: "border-orange-500/25 bg-orange-500/15 text-orange-300",
    green: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
    red: "border-red-500/25 bg-red-500/15 text-red-300",
    slate: "border-slate-600 bg-slate-800/80 text-slate-300"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex min-h-[108px] items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1 @container">
          <p className="truncate text-sm text-slate-400">{title}</p>
          <p className="mt-2 truncate font-semibold text-slate-100 text-[clamp(1.125rem,11cqw,1.5rem)] tracking-tight">{value}</p>
          {helper ? <p className="mt-1 truncate text-xs text-slate-500">{helper}</p> : null}
        </div>
        <div className={cn("shrink-0 rounded-lg border p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

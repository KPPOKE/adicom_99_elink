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
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-300 bg-slate-100 text-slate-700"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex min-h-[124px] items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1 @container">
          <p className="text-sm leading-snug text-slate-600">{title}</p>
          <p className="mt-2 break-words font-semibold leading-tight text-slate-900 text-[clamp(1.125rem,11cqw,1.5rem)] tracking-tight">{value}</p>
          {helper ? <p className="mt-1 text-xs leading-snug text-slate-500">{helper}</p> : null}
        </div>
        <div className={cn("shrink-0 rounded-lg border p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

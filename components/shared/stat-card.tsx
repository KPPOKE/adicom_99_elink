import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "blue"
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "orange" | "green" | "red" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    cyan: "bg-cyan-50 text-cyan-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700"
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={cn("rounded-lg p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

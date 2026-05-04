import { Badge } from "@/components/ui/badge";

export function StockBadge({ stok, minimum }: { stok: number; minimum: number }) {
  if (stok <= 0) return <Badge variant="red">Habis</Badge>;
  if (stok <= minimum) return <Badge variant="orange">Hampir Habis</Badge>;
  return <Badge variant="green">Aman</Badge>;
}

export function ServiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "slate" | "blue" | "cyan" | "orange" | "red" | "green" }> = {
    Masuk: { label: "Masuk", variant: "blue" },
    Dicek: { label: "Dicek", variant: "cyan" },
    Menunggu_Konfirmasi: { label: "Menunggu Konfirmasi", variant: "orange" },
    Diproses: { label: "Diproses", variant: "orange" },
    Selesai: { label: "Selesai", variant: "green" },
    Diambil: { label: "Diambil", variant: "slate" },
    Batal: { label: "Batal", variant: "red" }
  };
  const item = map[status] ?? { label: status, variant: "slate" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

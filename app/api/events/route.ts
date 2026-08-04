import { NextResponse } from "next/server";
import { getNotifications } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const notifications = await getNotifications();
  return NextResponse.json(notifications, {
    headers: { "Cache-Control": "private, no-store" }
  });
}

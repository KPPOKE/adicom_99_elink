import "server-only";

import { headers } from "next/headers";

function normalizeHost(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() ?? "";
}

export async function assertTrustedOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");
  const host = normalizeHost(headerStore.get("x-forwarded-host") || headerStore.get("host"));
  const source = origin || referer;
  if (!source || !host) return;

  let sourceHost = "";
  try {
    sourceHost = new URL(source).host.toLowerCase();
  } catch {
    throw new Error("Origin request tidak valid");
  }

  if (sourceHost !== host) throw new Error("Origin request tidak diizinkan");
}

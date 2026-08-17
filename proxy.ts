import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

// Mirrors the stateless HMAC check in lib/auth.ts (verifySessionToken). Kept
// standalone here (no Prisma import) so this stays a lightweight, cheap-to-run
// check on every request; the DB-backed active/permission checks still
// happen in requireUser()/requirePermission() on the page.
const COOKIE_NAME = "pospintar_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return value;
  return "dev-secret-change-me-for-production-32";
}

function hasValidSession(token: string | undefined) {
  try {
    if (!token) return false;
    const [body, signature] = token.split(".");
    if (!body || !signature) return false;
    const expected = createHmac("sha256", secret()).update(body).digest("base64url");
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return Boolean(payload.userId) && ["admin", "staff"].includes(payload.role) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = hasValidSession(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|receipt|_next/static|_next/image|favicon.ico|icon.svg|.*\\.\\w+$).*)"]
};

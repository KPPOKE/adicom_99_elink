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
  if (process.env.NODE_ENV === "production") {
    // Fail closed: throwing here is caught by hasValidSession's try/catch,
    // which treats it as "no session" rather than accepting a guessable
    // hardcoded secret. Matches lib/auth.ts's secret().
    throw new Error("AUTH_SECRET minimal 32 karakter wajib diset untuk production");
  }
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

// Routes that manage their own access control and must stay reachable
// without a session: API handlers and the public receipt print page.
function isPublicPath(pathname: string) {
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  if (pathname === "/receipt" || pathname.startsWith("/receipt/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const session = hasValidSession(request.cookies.get(COOKIE_NAME)?.value);

  // Note: /login stays reachable even with a valid session. Bouncing an
  // authenticated visit straight to /dashboard would also swallow the login
  // form's own POST (a Next.js server action to this same path), breaking
  // the legitimate "log in as a different account without clicking Keluar
  // first" flow - which this app's own e2e suite relies on.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.\\w+$).*)"]
};

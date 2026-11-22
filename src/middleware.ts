import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isPublicAdminPath, routeRequirement, satisfies } from "@/config/rbac";
import { routing } from "@/i18n/routing";

/**
 * Single Edge middleware with two independent branches:
 *
 *  /admin/**, /api/admin/**  → RBAC layer 1 (session + route permission).
 *     no session  → /admin/login?callbackUrl=…   (API: 401 JSON)
 *     wrong role  → /admin/forbidden, HTTP 403   (API: 403 JSON)
 *     Layers 2 (server guards) and 3 (conditional UI) enforce independently.
 *
 *  everything else           → next-intl locale routing (Tetun default, no prefix).
 */
const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

const adminGate = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const isApi = pathname.startsWith("/api/");

  // The Edge layer only decodes the JWT; it cannot tell whether the account was
  // since deactivated or its session revoked. So "already signed in → leave the
  // login page" is decided by the login page itself (DB-revalidated); redirecting
  // here would loop for revoked sessions.
  if (isPublicAdminPath(pathname)) return NextResponse.next();

  const requirement = routeRequirement(pathname);
  if (!requirement) return NextResponse.next();

  if (!user) {
    if (isApi) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const login = new URL("/admin/login", req.nextUrl);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (!satisfies(user.role, requirement)) {
    if (isApi) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.rewrite(new URL("/admin/forbidden", req.nextUrl), { status: 403 });
  }

  return NextResponse.next();
});

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (isAdminPath(request.nextUrl.pathname)) {
    return adminGate(request as Parameters<typeof adminGate>[0], event as never);
  }
  return intlMiddleware(request);
}

export const config = {
  // All pages except Next internals, static files, and non-admin API routes.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin/:path*"],
};

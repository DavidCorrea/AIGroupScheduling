import { NextRequest, NextResponse } from "next/server";

function isPublicPath(pathname: string): boolean {
  // Auth API routes
  if (pathname.startsWith("/api/auth")) return true;

  // Login page
  if (pathname === "/login") return true;

  // Admin routes (auth handled at API/page level for bootstrap support)
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/admin")) return true;

  const segments = pathname.split("/").filter(Boolean);

  // /:slug/cronograma and subpaths (public schedule views)
  if (segments.length >= 2 && segments[1] === "cronograma") return true;

  // /api/cronograma/:slug/... (public API)
  if (segments[0] === "api" && segments[1] === "cronograma") return true;

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for Auth.js session cookie (JWT strategy)
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    // API calls get 401, page requests get redirected to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

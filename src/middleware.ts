import { NextRequest, NextResponse } from "next/server";

function isPublicPath(pathname: string): boolean {
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

  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [user, password] = decoded.split(":");
      if (user === adminUser && password === adminPassword) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Cronogramas Admin"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

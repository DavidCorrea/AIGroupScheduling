import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "@/lib/api-helpers";
import { adminAuthSchema } from "@/lib/schemas/admin";
import { createBootstrapToken } from "@/lib/admin-bootstrap-token";
import { checkAdminAuthRateLimit } from "@/lib/rate-limit";

/**
 * Bootstrap admin authentication.
 * Only works when no admin users exist in the database.
 * Validates ADMIN_USERNAME/ADMIN_PASSWORD from env and sets a short-lived random token in a cookie
 * (never the raw password). Rate limited per IP.
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuthRateLimit(request)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 }
    );
  }

  // Check if any admin users exist
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .limit(1);

  if (admins.length > 0) {
    return NextResponse.json(
      { error: "Ya existen usuarios administradores. Usa tu cuenta de Google para acceder." },
      { status: 403 }
    );
  }

  const raw = await request.json();
  const parsed = parseBody(adminAuthSchema, raw);
  if (parsed.error) return parsed.error;
  const { username, password } = parsed.data;

  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;

  if (!envUser || !envPass) {
    return NextResponse.json(
      { error: "Las credenciales de administrador no están configuradas en el servidor." },
      { status: 500 }
    );
  }

  if (username !== envUser || password !== envPass) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const token = createBootstrapToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-bootstrap-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  return response;
}

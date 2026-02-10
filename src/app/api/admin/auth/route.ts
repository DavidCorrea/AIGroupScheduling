import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Bootstrap admin authentication.
 * Only works when no admin users exist in the database.
 * Validates ADMIN_USERNAME/ADMIN_PASSWORD from env and sets a short-lived cookie.
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { username, password } = body;

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

  // Set a bootstrap cookie (expires in 1 hour)
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin-bootstrap-token", envPass, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  return response;
}

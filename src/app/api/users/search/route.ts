import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { ilike, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const pattern = `%${query.trim()}%`;

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(
      or(
        ilike(users.email, pattern),
        ilike(users.name, pattern)
      )
    )
    .limit(10);

  return NextResponse.json(results);
}

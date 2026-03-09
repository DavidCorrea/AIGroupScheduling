import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { ilike, or } from "drizzle-orm";
import { requireAuth, extractGroupIdOrSlug, hasGroupAccess, apiError } from "@/lib/api-helpers";
import { checkUserSearchRateLimit } from "@/lib/rate-limit";

/**
 * Search users by name/email. Restricted to callers with group access (e.g. adding collaborators).
 * Requires ?groupId=N or ?slug=xxx and enforces hasGroupAccess. Rate limited per IP.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (!checkUserSearchRateLimit(request)) {
    return apiError("Demasiadas búsquedas. Intenta más tarde.", 429, "RATE_LIMITED");
  }

  const groupIdResult = await extractGroupIdOrSlug(request);
  if (groupIdResult instanceof NextResponse) return groupIdResult;
  const groupId = groupIdResult;

  const access = await hasGroupAccess(authResult.user.id, groupId);
  if (!access) {
    return apiError("Sin permiso", 403, "FORBIDDEN");
  }

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

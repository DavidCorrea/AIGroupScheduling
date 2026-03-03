import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exclusiveGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireGroupAccess, apiError, parseBody } from "@/lib/api-helpers";
import { exclusiveGroupCreateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const allGroups = await db
    .select()
    .from(exclusiveGroups)
    .where(eq(exclusiveGroups.groupId, groupId))
    .orderBy(exclusiveGroups.name);
  return NextResponse.json(allGroups);
}

export async function POST(request: NextRequest) {
  const accessResult = await requireGroupAccess(request);
  if (accessResult.error) return accessResult.error;
  const { groupId } = accessResult;

  const raw = await request.json();
  const parsed = parseBody(exclusiveGroupCreateSchema, raw);
  if (parsed.error) return parsed.error;
  const { name } = parsed.data;

  const group = (await db
    .insert(exclusiveGroups)
    .values({ name, groupId })
    .returning())[0];

  return NextResponse.json(group, { status: 201 });
}

// DELETE by id: use DELETE /api/configuration/exclusive-groups/[id]?groupId= or ?slug=

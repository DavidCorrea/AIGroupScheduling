import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exclusiveGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractGroupId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const allGroups = await db
    .select()
    .from(exclusiveGroups)
    .where(eq(exclusiveGroups.groupId, groupId))
    .orderBy(exclusiveGroups.name);
  return NextResponse.json(allGroups);
}

export async function POST(request: NextRequest) {
  const groupId = extractGroupId(request);
  if (groupId instanceof NextResponse) return groupId;

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 }
    );
  }

  const group = (await db
    .insert(exclusiveGroups)
    .values({ name: name.trim(), groupId })
    .returning())[0];

  return NextResponse.json(group, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Group id is required" },
      { status: 400 }
    );
  }

  const exGroupId = parseInt(id, 10);
  const existing = (await db.select().from(exclusiveGroups).where(eq(exclusiveGroups.id, exGroupId)))[0];
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  await db.delete(exclusiveGroups).where(eq(exclusiveGroups.id, exGroupId));

  return NextResponse.json({ success: true });
}

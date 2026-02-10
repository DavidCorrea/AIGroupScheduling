import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exclusiveGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allGroups = await db.select().from(exclusiveGroups).orderBy(exclusiveGroups.name);
  return NextResponse.json(allGroups);
}

export async function POST(request: NextRequest) {
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
    .values({ name: name.trim() })
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

  const groupId = parseInt(id, 10);
  const existing = (await db.select().from(exclusiveGroups).where(eq(exclusiveGroups.id, groupId)))[0];
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Roles referencing this group will have exclusive_group_id set to null via FK onDelete: "set null"
  await db.delete(exclusiveGroups).where(eq(exclusiveGroups.id, groupId));

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDefaults } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const group = (await db
      .select()
      .from(groups)
      .where(eq(groups.slug, slug)))[0];

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(group);
  }

  const allGroups = await db.select().from(groups).orderBy(groups.name);
  return NextResponse.json(allGroups);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "El nombre es obligatorio" },
      { status: 400 }
    );
  }

  if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
    return NextResponse.json(
      { error: "El slug es obligatorio" },
      { status: 400 }
    );
  }

  // Validate slug format (lowercase, alphanumeric, hyphens)
  if (!/^[a-z0-9-]+$/.test(slug.trim())) {
    return NextResponse.json(
      { error: "El slug solo puede contener letras minúsculas, números y guiones" },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = (await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug.trim())))[0];

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un grupo con ese slug" },
      { status: 409 }
    );
  }

  const group = (await db
    .insert(groups)
    .values({ name: name.trim(), slug: slug.trim() })
    .returning())[0];

  // Seed default schedule days for the new group
  await seedDefaults(group.id);

  return NextResponse.json(group, { status: 201 });
}

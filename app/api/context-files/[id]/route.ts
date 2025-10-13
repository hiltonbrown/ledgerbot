import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth/clerk-helpers";
import { db, deleteContextFile } from "@/lib/db/queries";
import { contextFile } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [file] = await db
    .select()
    .from(contextFile)
    .where(and(eq(contextFile.id, id), eq(contextFile.userId, user.id)))
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [deleted] = await deleteContextFile({
      id,
      userId: user.id,
    });
    if (!deleted) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete context file", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const updates: Partial<{
    description: string | null;
    isPinned: boolean;
    tags: string[] | null;
  }> = {};

  if ("description" in body) {
    updates.description = body.description ?? null;
  }

  if ("isPinned" in body) {
    updates.isPinned = Boolean(body.isPinned);
  }

  if ("tags" in body) {
    updates.tags = Array.isArray(body.tags) ? body.tags : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(contextFile)
    .set(updates)
    .where(and(eq(contextFile.id, id), eq(contextFile.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

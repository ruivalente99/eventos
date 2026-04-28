import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function canManageEvent(userId: string, globalRole: string, eventId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  const role = await prisma.eventUser.findFirst({
    where: { userId, eventId, role: "ADMIN" },
  });
  return !!role;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stations: { orderBy: { name: "asc" } },
      criteria: { orderBy: { displayOrder: "asc" } },
      courses: { orderBy: { entryOrder: "asc" } },
      users: { include: { user: true, station: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const allowed = await canManageEvent(session.user.id, session.user.globalRole, id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.active !== undefined) data.active = body.active;
  if (body.slug !== undefined) data.slug = slugify(body.slug);
  if (body.emoji !== undefined) data.emoji = body.emoji;

  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

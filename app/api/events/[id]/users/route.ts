import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function canManage(userId: string, globalRole: string, eventId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  const r = await prisma.eventUser.findFirst({ where: { userId, eventId, role: "ADMIN" } });
  return !!r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManage(session.user.id, session.user.globalRole, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.eventUser.findMany({
    where: { eventId: id },
    include: { user: { select: { id: true, name: true, email: true } }, station: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;
  if (!(await canManage(session.user.id, session.user.globalRole, eventId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role, stationId, existingUserId } = body;

  let userId = existingUserId;
  if (!userId) {
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      create: { name, email, password: hashed },
      update: {},
    });
    userId = user.id;
  }

  const eventUser = await prisma.eventUser.create({
    data: { userId, eventId, role, stationId: stationId || null },
    include: { user: { select: { id: true, name: true, email: true } }, station: true },
  });
  return NextResponse.json(eventUser, { status: 201 });
}

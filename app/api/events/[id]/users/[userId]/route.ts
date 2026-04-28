import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId, userId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { stationId: body.stationId ?? null, role: body.role };
  if (body.emoji !== undefined) data.emoji = body.emoji;
  const eu = await prisma.eventUser.update({
    where: { id: userId },
    data,
    include: { user: { select: { id: true, name: true, email: true, loginToken: true } }, station: true },
  });
  return NextResponse.json(eu);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  await prisma.eventUser.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

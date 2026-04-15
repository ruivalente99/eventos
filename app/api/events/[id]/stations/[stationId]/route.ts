import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stationId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.weight !== undefined) data.weight = body.weight;
  if (body.active !== undefined) data.active = body.active;
  const station = await prisma.station.update({ where: { id: stationId }, data });
  return NextResponse.json(station);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stationId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  await prisma.station.delete({ where: { id: stationId } });
  return NextResponse.json({ ok: true });
}

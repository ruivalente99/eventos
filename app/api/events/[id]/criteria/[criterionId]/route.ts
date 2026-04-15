import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; criterionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { criterionId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.weight !== undefined) data.weight = body.weight;
  if (body.minScore !== undefined) data.minScore = body.minScore;
  if (body.maxScore !== undefined) data.maxScore = body.maxScore;
  if (body.active !== undefined) data.active = body.active;
  const criterion = await prisma.evaluationCriteria.update({ where: { id: criterionId }, data });
  return NextResponse.json(criterion);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; criterionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { criterionId } = await params;
  await prisma.evaluationCriteria.delete({ where: { id: criterionId } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canManage(userId: string, globalRole: string, eventId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  const r = await prisma.eventUser.findFirst({ where: { userId, eventId, role: "ADMIN" } });
  return !!r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const criteria = await prisma.evaluationCriteria.findMany({
    where: { eventId: id },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(criteria);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;
  if (!(await canManage(session.user.id, session.user.globalRole, eventId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const max = await prisma.evaluationCriteria.findFirst({ where: { eventId }, orderBy: { displayOrder: "desc" } });
  const criterion = await prisma.evaluationCriteria.create({
    data: {
      eventId,
      name: body.name,
      code: body.code,
      weight: body.weight ?? 1.0,
      minScore: body.minScore ?? 0,
      maxScore: body.maxScore ?? 100,
      displayOrder: (max?.displayOrder ?? -1) + 1,
      type: body.type ?? "CATEGORY",
    },
  });
  return NextResponse.json(criterion, { status: 201 });
}

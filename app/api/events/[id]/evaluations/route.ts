import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

async function canManage(userId: string, globalRole: string, eventId: string) {
  if (globalRole === "SUPER_ADMIN") return true;
  const r = await prisma.eventUser.findFirst({ where: { userId, eventId, role: "ADMIN" } });
  return !!r;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;

  if (!(await canManage(session.user.id, session.user.globalRole, eventId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const courseId = searchParams.get("courseId");
  const stationId = searchParams.get("stationId");

  const where: Record<string, unknown> = { eventId };
  if (userId) where.jurorId = userId;
  if (courseId) where.courseId = courseId;
  if (stationId) where.stationId = stationId;

  const { count } = await prisma.evaluation.deleteMany({ where });

  revalidateTag(`leaderboard:${eventId}`, {});

  return NextResponse.json({ deleted: count });
}

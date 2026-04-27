import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const courseId = searchParams.get("courseId");
  const stationId = searchParams.get("stationId");

  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (courseId) where.courseId = courseId;
  if (stationId) where.stationId = stationId;

  // Jury can only see own evaluations
  const role = session.user.globalRole;
  if (role !== "SUPER_ADMIN") {
    const isAdmin = eventId
      ? await prisma.eventUser.findFirst({ where: { userId: session.user.id, eventId, role: "ADMIN" } })
      : null;
    if (!isAdmin) where.jurorId = session.user.id;
  }

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      course: true,
      station: true,
      juror: { select: { id: true, name: true } },
      scores: { include: { criteria: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(evaluations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { eventId, courseId, stationId, scores, notes } = body;

  // Verify jury is assigned to this station
  const eventUser = await prisma.eventUser.findFirst({
    where: { userId: session.user.id, eventId },
  });
  if (!eventUser) return NextResponse.json({ error: "Not a member of this event" }, { status: 403 });

  const evaluation = await prisma.evaluation.upsert({
    where: { courseId_stationId: { courseId, stationId } },
    create: {
      eventId,
      courseId,
      stationId,
      jurorId: session.user.id,
      notes,
      scores: {
        createMany: {
          data: scores.map((s: { criteriaId: string; score: number }) => ({
            criteriaId: s.criteriaId,
            score: s.score,
          })),
        },
      },
    },
    update: {
      notes,
      updatedAt: new Date(),
      scores: {
        deleteMany: {},
        createMany: {
          data: scores.map((s: { criteriaId: string; score: number }) => ({
            criteriaId: s.criteriaId,
            score: s.score,
          })),
        },
      },
    },
    include: {
      scores: { include: { criteria: true } },
      course: true,
      station: true,
    },
  });

  revalidateTag(`leaderboard:${eventId}`, {});

  return NextResponse.json(evaluation, { status: 201 });
}

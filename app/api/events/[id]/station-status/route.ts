import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  if (session.user.globalRole !== "SUPER_ADMIN") {
    const isAdmin = await prisma.eventUser.findFirst({
      where: { userId: session.user.id, eventId, role: "ADMIN" },
    });
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [stations, courses, evaluations] = await Promise.all([
    prisma.station.findMany({
      where: { eventId, active: true },
      orderBy: { name: "asc" },
      include: {
        jurors: {
          where: { role: "JURY" },
          include: { user: { select: { name: true } } },
        },
      },
    }),
    prisma.eventCourse.findMany({
      where: { eventId, disqualified: false, hidden: false },
      orderBy: { entryOrder: "asc" },
    }),
    prisma.evaluation.findMany({
      where: { eventId },
      select: { courseId: true, stationId: true },
    }),
  ]);

  const totalCourses = courses.length;

  const result = stations.map((station) => {
    const evaluatedIds = new Set(
      evaluations.filter((e) => e.stationId === station.id).map((e) => e.courseId)
    );
    const currentCourse = courses.find((c) => !evaluatedIds.has(c.id)) ?? null;

    return {
      stationId: station.id,
      stationName: station.name,
      jurors: station.jurors.map((ju) => ({ name: ju.user.name, emoji: ju.emoji })),
      currentCourse: currentCourse
        ? { id: currentCourse.id, name: currentCourse.name, entryOrder: currentCourse.entryOrder }
        : null,
      evaluatedCount: evaluatedIds.size,
      totalCourses,
    };
  });

  return NextResponse.json(result);
}

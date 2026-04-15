import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;

  const [courses, stations, evaluations] = await Promise.all([
    prisma.eventCourse.findMany({ where: { eventId }, orderBy: { entryOrder: "asc" } }),
    prisma.station.findMany({ where: { eventId, active: true } }),
    prisma.evaluation.findMany({
      where: { eventId },
      include: {
        scores: { include: { criteria: true } },
        station: true,
        juror: { select: { name: true } },
      },
    }),
  ]);

  const leaderboard = courses.map((course) => {
    const courseEvals = evaluations.filter((e) => e.courseId === course.id);
    let totalWeighted = 0;
    const stationBreakdown: Record<string, { score: number; weight: number; juror: string }> = {};

    for (const station of stations) {
      const eval_ = courseEvals.find((e) => e.stationId === station.id);
      if (eval_) {
        const raw = eval_.scores.reduce((sum, s) => sum + s.score * s.criteria.weight, 0);
        const maxPossible = eval_.scores.reduce((sum, s) => sum + s.criteria.maxScore * s.criteria.weight, 0);
        const normalized = maxPossible > 0 ? (raw / maxPossible) * 100 : 0;
        const weighted = normalized * station.weight;
        stationBreakdown[station.name] = { score: Math.round(normalized * 100) / 100, weight: station.weight, juror: eval_.juror.name };
        totalWeighted += weighted;
      } else {
        stationBreakdown[station.name] = { score: 0, weight: station.weight, juror: "-" };
      }
    }

    const totalWeight = stations.reduce((sum, s) => sum + s.weight, 0);
    const finalScore = totalWeight > 0 ? totalWeighted / totalWeight : 0;

    return {
      id: course.id,
      name: course.name,
      entryOrder: course.entryOrder,
      disqualified: course.disqualified,
      finalScore: Math.round(finalScore * 100) / 100,
      stations: stationBreakdown,
      evaluated: courseEvals.length,
    };
  });

  leaderboard.sort((a, b) => {
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    return b.finalScore - a.finalScore;
  });

  return NextResponse.json({ leaderboard, stations });
}

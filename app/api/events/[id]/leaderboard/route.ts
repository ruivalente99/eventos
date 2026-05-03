import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { computeNormalizedScore } from "@/lib/scoring";

function buildLeaderboard(
  courses: { id: string; name: string; entryOrder: number; disqualified: boolean }[],
  stations: { id: string; name: string; weight: number }[],
  evaluations: {
    courseId: string;
    stationId: string;
    scores: { criteriaId: string; score: number }[];
    station: { name: string; weight: number };
    juror: { name: string };
  }[],
  rootCriteria: Parameters<typeof computeNormalizedScore>[1]
) {
  const leaderboard = courses.map((course) => {
    const courseEvals = evaluations.filter((e) => e.courseId === course.id);
    let totalWeighted = 0;
    const stationBreakdown: Record<string, { score: number; weight: number; juror: string }> = {};

    for (const station of stations) {
      const stationEvals = courseEvals.filter((e) => e.stationId === station.id);
      if (stationEvals.length > 0) {
        const scores = stationEvals.map((e) => computeNormalizedScore(e.scores, rootCriteria));
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const weighted = avg * station.weight;
        stationBreakdown[station.name] = {
          score: Math.round(avg * 100) / 100,
          weight: station.weight,
          juror: stationEvals.map((e) => e.juror.name).join(", "),
        };
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

  return leaderboard;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await params;

  const getLeaderboard = unstable_cache(
    async () => {
      const [courses, stations, evaluations, allCriteria] = await Promise.all([
        prisma.eventCourse.findMany({ where: { eventId, hidden: false }, orderBy: { entryOrder: "asc" } }),
        prisma.station.findMany({ where: { eventId, active: true } }),
        prisma.evaluation.findMany({
          where: { eventId },
          include: {
            scores: true,
            station: true,
            juror: { select: { name: true } },
          },
        }),
        prisma.evaluationCriteria.findMany({
          where: { eventId, active: true },
          include: { children: { where: { active: true } } },
        }),
      ]);

      const rootCriteria = allCriteria.filter((c) => c.parentId === null);
      const leaderboard = buildLeaderboard(courses, stations, evaluations, rootCriteria);
      return { leaderboard, stations };
    },
    [`leaderboard-${eventId}`],
    { tags: [`leaderboard:${eventId}`], revalidate: 60 }
  );

  const data = await getLeaderboard();
  return NextResponse.json(data);
}

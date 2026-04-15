import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [courses, stations, evaluations, criteria] = await Promise.all([
    prisma.eventCourse.findMany({ where: { eventId }, orderBy: { entryOrder: "asc" } }),
    prisma.station.findMany({ where: { eventId, active: true } }),
    prisma.evaluation.findMany({
      where: { eventId },
      include: {
        scores: { include: { criteria: true } },
        station: true,
        juror: { select: { name: true } },
        course: true,
      },
    }),
    prisma.evaluationCriteria.findMany({ where: { eventId, active: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  // Sheet 1 – Leaderboard
  const leaderboardRows = courses.map((course) => {
    const row: Record<string, unknown> = {
      "#": course.entryOrder,
      Curso: course.name,
      Desclassificado: course.disqualified ? "Sim" : "Não",
    };
    let totalWeighted = 0;
    let totalWeight = 0;
    for (const station of stations) {
      const ev = evaluations.find((e) => e.courseId === course.id && e.stationId === station.id);
      if (ev) {
        const raw = ev.scores.reduce((s, sc) => s + sc.score * sc.criteria.weight, 0);
        const max = ev.scores.reduce((s, sc) => s + sc.criteria.maxScore * sc.criteria.weight, 0);
        const norm = max > 0 ? (raw / max) * 100 : 0;
        row[station.name] = Math.round(norm * 100) / 100;
        totalWeighted += norm * station.weight;
      } else {
        row[station.name] = "-";
      }
      totalWeight += station.weight;
    }
    row["Total"] = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) / 100 : 0;
    return row;
  });
  leaderboardRows.sort((a, b) => (b["Total"] as number) - (a["Total"] as number));

  // Sheet 2 – Votes detail
  const detailRows = evaluations.flatMap((ev) =>
    ev.scores.map((s) => ({
      Evento: event.name,
      Posto: ev.station.name,
      Júri: ev.juror.name,
      Curso: ev.course.name,
      Critério: s.criteria.name,
      Peso: s.criteria.weight,
      Pontuação: s.score,
      "Pontuação Ponderada": Math.round(s.score * s.criteria.weight * 100) / 100,
      Data: ev.createdAt,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaderboardRows), "Classificação");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Votos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${event.slug}-resultados.xlsx"`,
    },
  });
}

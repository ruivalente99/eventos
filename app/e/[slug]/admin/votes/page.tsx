import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VotesLog } from "@/components/admin/votes-log";

export default async function VotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const [evaluations, eventUsers, stations, courses] = await Promise.all([
    prisma.evaluation.findMany({
      where: { eventId: event.id },
      include: {
        juror: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, entryOrder: true } },
        station: { select: { id: true, name: true } },
        scores: { include: { criteria: { select: { name: true, weight: true, maxScore: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.eventUser.findMany({
      where: { eventId: event.id, role: "JURY" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.station.findMany({ where: { eventId: event.id, active: true }, orderBy: { name: "asc" } }),
    prisma.eventCourse.findMany({ where: { eventId: event.id }, orderBy: { entryOrder: "asc" } }),
  ]);

  const jurors = eventUsers.map((eu: { user: { id: string; name: string } }) => eu.user);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Registos de Votação</h2>
        <p className="text-sm text-muted-foreground">{evaluations.length} avaliação{evaluations.length !== 1 ? "ões" : ""} submetidas</p>
      </div>
      <VotesLog
        evaluations={JSON.parse(JSON.stringify(evaluations))}
        eventId={event.id}
        jurors={jurors}
        stations={stations}
        courses={JSON.parse(JSON.stringify(courses))}
      />
    </div>
  );
}

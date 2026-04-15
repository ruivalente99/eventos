import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VotesLog } from "@/components/admin/votes-log";

export default async function VotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const evaluations = await prisma.evaluation.findMany({
    where: { eventId: event.id },
    include: {
      juror: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, entryOrder: true } },
      station: { select: { id: true, name: true } },
      scores: { include: { criteria: { select: { name: true, weight: true, maxScore: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Registos de Votação</h2>
        <p className="text-sm text-muted-foreground">{evaluations.length} avaliação{evaluations.length !== 1 ? "ões" : ""} submetidas</p>
      </div>
      <VotesLog evaluations={JSON.parse(JSON.stringify(evaluations))} />
    </div>
  );
}

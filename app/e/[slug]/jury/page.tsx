import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { JuryDashboard } from "@/components/jury/jury-dashboard";

export default async function JuryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/e/${slug}`);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const eventUser = await prisma.eventUser.findFirst({
    where: { userId: session.user.id, eventId: event.id },
    include: { station: true },
  });

  // Admins can view jury interface too
  if (!eventUser && session.user.globalRole !== "SUPER_ADMIN") redirect(`/e/${slug}`);

  const [courses, criteria, myEvaluations] = await Promise.all([
    prisma.eventCourse.findMany({ where: { eventId: event.id }, orderBy: { entryOrder: "asc" } }),
    prisma.evaluationCriteria.findMany({ where: { eventId: event.id, active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.evaluation.findMany({
      where: { eventId: event.id, jurorId: session.user.id },
      include: { scores: true },
    }),
  ]);

  return (
    <JuryDashboard
      event={{ id: event.id, name: event.name, slug: event.slug }}
      jurorId={session.user.id}
      jurorName={session.user.name}
      station={eventUser?.station ?? null}
      courses={courses}
      criteria={criteria}
      initialEvaluations={myEvaluations}
    />
  );
}

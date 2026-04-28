import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { JuryDashboard } from "@/components/jury/jury-dashboard";

export default async function JuryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/e/${slug}`);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const eventUser = await prisma.eventUser.findFirst({
    where: { userId: session.user.id, eventId: event.id },
    include: { station: true, user: { select: { id: true } } },
  });

  if (eventUser?.role === "ADMIN") redirect(`/e/${slug}/admin/jury`);
  if (!eventUser && session.user.globalRole !== "SUPER_ADMIN") redirect(`/e/${slug}`);

  const getCriteria = unstable_cache(
    () =>
      prisma.evaluationCriteria.findMany({
        where: { eventId: event.id, active: true },
        orderBy: { displayOrder: "asc" },
        include: {
          children: {
            where: { active: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      }),
    [`criteria-${event.id}`],
    { tags: [`criteria:${event.id}`], revalidate: 300 }
  );

  const getCourses = unstable_cache(
    () =>
      prisma.eventCourse.findMany({
        where: { eventId: event.id },
        orderBy: { entryOrder: "asc" },
      }),
    [`courses-${event.id}`],
    { tags: [`courses:${event.id}`], revalidate: 300 }
  );

  const [courses, criteria, myEvaluations] = await Promise.all([
    getCourses(),
    getCriteria(),
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
      jurorEmoji={eventUser?.emoji ?? null}
      eventUserId={eventUser?.id ?? ""}
      station={eventUser?.station ?? null}
      courses={courses}
      criteria={criteria}
      initialEvaluations={myEvaluations}
    />
  );
}

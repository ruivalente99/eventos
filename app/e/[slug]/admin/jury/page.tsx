import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EventJuryManager } from "@/components/admin/event-jury-manager";

export default async function EventJuryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const [eventUsers, stations, allUsers] = await Promise.all([
    prisma.eventUser.findMany({
      where: { eventId: event.id },
      include: { user: { select: { id: true, name: true, email: true } }, station: true },
    }),
    prisma.station.findMany({ where: { eventId: event.id }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  return <EventJuryManager eventId={event.id} initialUsers={eventUsers} stations={stations} allUsers={allUsers} />;
}

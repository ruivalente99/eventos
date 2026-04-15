import { prisma } from "@/lib/prisma";
import { EventsManager } from "@/components/admin/events-manager";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    include: { _count: { select: { users: true, courses: true, stations: true } } },
    orderBy: { createdAt: "desc" },
  });
  return <EventsManager initialEvents={events} />;
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StationsManager } from "@/components/admin/stations-manager";

export default async function EventStationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();
  const stations = await prisma.station.findMany({ where: { eventId: event.id }, orderBy: { name: "asc" } });
  return <StationsManager eventId={event.id} initialStations={stations} />;
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LeaderboardView } from "@/components/admin/leaderboard-view";

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();
  return <LeaderboardView eventId={event.id} eventSlug={event.slug} eventName={event.name} />;
}

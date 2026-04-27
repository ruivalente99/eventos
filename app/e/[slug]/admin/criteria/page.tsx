import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CriteriaManager } from "@/components/admin/criteria-manager";

export default async function EventCriteriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();
  const criteria = await prisma.evaluationCriteria.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
    include: {
      children: { orderBy: { displayOrder: "asc" } },
    },
  });
  return <CriteriaManager eventId={event.id} initialCriteria={criteria} />;
}

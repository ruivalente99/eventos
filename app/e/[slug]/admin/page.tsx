import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, MapPin, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { EventActiveToggle } from "@/components/admin/event-active-toggle";

export default async function EventAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: { select: { users: true, courses: true, stations: true } },
      courses: { where: { disqualified: false } },
      stations: { where: { active: true } },
    },
  });
  if (!event) notFound();

  const totalEvals = await prisma.evaluation.count({ where: { eventId: event.id } });
  const totalPossible = event.courses.length * event.stations.length;

  const base = `/e/${slug}/admin`;
  const stats = [
    { label: "Júris/Admins", value: event._count.users, icon: Users, href: `${base}/jury` },
    { label: "Cursos", value: event._count.courses, icon: BookOpen, href: `${base}/courses` },
    { label: "Postos", value: event._count.stations, icon: MapPin, href: `${base}/stations` },
    { label: "Avaliações", value: `${totalEvals}/${totalPossible}`, icon: ClipboardCheck, href: `${base}/leaderboard` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{event.name}</h2>
          <span className="text-sm text-muted-foreground">eventos.cvutad.pt/e/{event.slug}</span>
        </div>
        <EventActiveToggle eventId={event.id} initialActive={event.active} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPossible > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Progresso das Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${totalPossible > 0 ? (totalEvals / totalPossible) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPossible > 0 ? Math.round((totalEvals / totalPossible) * 100) : 0}% concluído
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

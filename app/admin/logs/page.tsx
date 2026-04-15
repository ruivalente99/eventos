import { prisma } from "@/lib/prisma";
import { VotesLog } from "@/components/admin/votes-log";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function GlobalLogsPage() {
  const [evaluations, recentEvents] = await Promise.all([
    prisma.evaluation.findMany({
      include: {
        juror: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, entryOrder: true } },
        station: { select: { id: true, name: true } },
        scores: { include: { criteria: { select: { name: true, weight: true, maxScore: true } } } },
        // include event name via event relation
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.event.findMany({
      select: { id: true, name: true, slug: true, active: true, _count: { select: { users: true, courses: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEvals = await prisma.evaluation.count();
  const totalUsers = await prisma.user.count();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Logs de Atividade</h2>
        <p className="text-sm text-muted-foreground">Registo global de todas as avaliações</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Eventos</p>
            <p className="text-2xl font-bold">{recentEvents.length}</p>
            <p className="text-xs text-muted-foreground">{recentEvents.filter((e) => e.active).length} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Utilizadores</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avaliações</p>
            <p className="text-2xl font-bold">{totalEvals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Últimas 200</p>
            <p className="text-2xl font-bold">{evaluations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-event breakdown */}
      <div>
        <h3 className="font-semibold mb-2 text-sm">Por Evento</h3>
        <div className="space-y-2">
          {recentEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <Badge variant={e.active ? "success" : "secondary"} className="shrink-0">{e.active ? "Ativo" : "Inativo"}</Badge>
              <span className="font-medium flex-1 truncate">{e.name}</span>
              <span className="text-muted-foreground shrink-0">{e._count.users} júris · {e._count.courses} cursos</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3 text-sm">Avaliações (últimas 200)</h3>
        <VotesLog evaluations={JSON.parse(JSON.stringify(evaluations))} />
      </div>
    </div>
  );
}

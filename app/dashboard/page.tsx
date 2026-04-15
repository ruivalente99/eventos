import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { LogOut, CalendarDays } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole === "SUPER_ADMIN") redirect("/admin");

  const eventRoles = await prisma.eventUser.findMany({
    where: { userId: session.user.id },
    include: { event: true, station: true },
  });

  if (eventRoles.length === 1) {
    const r = eventRoles[0];
    if (r.role === "ADMIN") redirect(`/e/${r.event.slug}/admin`);
    if (r.role === "JURY") redirect(`/e/${r.event.slug}/jury`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 h-14 flex items-center justify-between sticky top-0 bg-background z-40">
        <div>
          <p className="font-semibold text-sm">Eventos CVUTAD</p>
          <p className="text-xs text-muted-foreground">{session.user.name}</p>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <Button variant="ghost" size="icon" type="submit"><LogOut className="h-4 w-4" /></Button>
        </form>
      </header>
      <main className="flex-1 p-4 space-y-3 max-w-lg mx-auto w-full">
        <h2 className="text-xl font-bold mt-2">Os meus eventos</h2>
        {eventRoles.map((r) => (
          <Link key={r.id} href={r.role === "ADMIN" ? `/e/${r.event.slug}/admin` : `/e/${r.event.slug}/jury`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{r.event.name}</p>
                  {r.station && <p className="text-xs text-muted-foreground">{r.station.name}</p>}
                </div>
                <Badge variant={r.role === "ADMIN" ? "default" : "secondary"}>
                  {r.role === "ADMIN" ? "Admin" : "Júri"}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {eventRoles.length === 0 && (
          <p className="text-center py-12 text-muted-foreground text-sm">Não estás atribuído a nenhum evento.</p>
        )}
      </main>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserSettingsPopover } from "@/components/ui/user-settings-popover";
import { signOut } from "@/lib/auth";
import { LogOut, CalendarDays } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole === "SUPER_ADMIN") redirect("/admin");

  const [eventRoles, dbUser] = await Promise.all([
    prisma.eventUser.findMany({
      where: { userId: session.user.id, event: { active: true } },
      include: { event: true, station: true },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { allowedThemes: true } }),
  ]);

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
        <div className="flex items-center gap-2">
          <UserSettingsPopover userId={session.user.id} userName={session.user.name} showEmoji={false} allowedThemes={dbUser?.allowedThemes} />
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <Button variant="ghost" size="icon" type="submit"><LogOut className="h-4 w-4" /></Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4 pt-6 pb-8 space-y-4 max-w-lg mx-auto w-full">
        <h2 className="text-xl font-bold">Os meus eventos</h2>
        {eventRoles.map((r) => (
          <Link key={r.id} href={r.role === "ADMIN" ? `/e/${r.event.slug}/admin` : `/e/${r.event.slug}/jury`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-xl">
                  {r.event.emoji ?? <CalendarDays className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.event.name}</p>
                  {r.station && (
                    <p className="text-xs text-muted-foreground mt-0.5">{r.station.name}</p>
                  )}
                </div>
                <Badge variant={r.role === "ADMIN" ? "default" : "outline"} className="shrink-0">
                  {r.role === "ADMIN" ? "Admin" : "Júri"}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {eventRoles.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Não estás atribuído a nenhum evento ativo.</p>
          </div>
        )}
      </main>
    </div>
  );
}

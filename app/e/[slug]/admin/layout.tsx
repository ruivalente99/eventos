import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TopNav } from "@/components/shared/nav";
import { LayoutDashboard, BookOpen, MapPin, Users, SlidersHorizontal, Trophy, ClipboardList } from "lucide-react";

export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/e/${slug}`);

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const role = await prisma.eventUser.findFirst({
      where: { userId: session.user.id, eventId: event.id, role: "ADMIN" },
    });
    if (!role) redirect(`/e/${slug}/jury`);
  }

  const base = `/e/${slug}/admin`;
  const navItems = [
    { label: "Resumo", href: base, icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Cursos", href: `${base}/courses`, icon: <BookOpen className="h-4 w-4" /> },
    { label: "Postos", href: `${base}/stations`, icon: <MapPin className="h-4 w-4" /> },
    { label: "Júris", href: `${base}/jury`, icon: <Users className="h-4 w-4" /> },
    { label: "Critérios", href: `${base}/criteria`, icon: <SlidersHorizontal className="h-4 w-4" /> },
    { label: "Classificação", href: `${base}/leaderboard`, icon: <Trophy className="h-4 w-4" /> },
    { label: "Registos", href: `${base}/votes`, icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav
        items={navItems}
        title={event.name}
        subtitle="Admin"
        backHref={isSuperAdmin ? "/admin" : "/dashboard"}
        backLabel="Voltar"
      />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-8">{children}</main>
    </div>
  );
}

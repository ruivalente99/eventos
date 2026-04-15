import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { LoginForm } from "@/components/shared/login-form";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.active) notFound();

  const session = await auth();

  if (session?.user) {
    // Check role in this event
    const eventUser = await prisma.eventUser.findFirst({
      where: { userId: session.user.id, eventId: event.id },
    });
    if (eventUser?.role === "ADMIN" || session.user.globalRole === "SUPER_ADMIN") {
      redirect(`/e/${slug}/admin`);
    }
    if (eventUser?.role === "JURY") {
      redirect(`/e/${slug}/jury`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          {event.description && (
            <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
          )}
        </div>
        <LoginForm eventSlug={slug} eventName={event.name} />
      </div>
    </div>
  );
}

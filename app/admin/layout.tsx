import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/nav";
import { LayoutDashboard, Users, BookOpen, CalendarDays, ClipboardList } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole !== "SUPER_ADMIN") redirect("/dashboard");

  const navItems = [
    { label: "Eventos", href: "/admin", icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Cursos", href: "/admin/courses", icon: <BookOpen className="h-4 w-4" /> },
    { label: "Utilizadores", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
    { label: "Logs", href: "/admin/logs", icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav items={navItems} title="Eventos CVUTAD" subtitle="Super Admin" />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-8">{children}</main>
    </div>
  );
}

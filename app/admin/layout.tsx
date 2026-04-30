import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/nav";
import { Users, BookOpen, CalendarDays, ClipboardList, Settings } from "lucide-react";
import { UserSettingsPopover } from "@/components/ui/user-settings-popover";
import { ALL_THEMES } from "@/lib/themes";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.globalRole !== "SUPER_ADMIN") redirect("/dashboard");

  const navItems = [
    { label: "Eventos", href: "/admin", icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Cursos", href: "/admin/courses", icon: <BookOpen className="h-4 w-4" /> },
    { label: "Utilizadores", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
    { label: "Logs", href: "/admin/logs", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Definições", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav
        items={navItems}
        title="Eventos CVUTAD"
        subtitle="Super Admin"
        settingsNode={
          <UserSettingsPopover
            userId={session.user.id}
            userName={session.user.name ?? ""}
            showEmoji={false}
            allowedThemes={ALL_THEMES.map((t) => t.id)}
          />
        }
      />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-8">{children}</main>
    </div>
  );
}

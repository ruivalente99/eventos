"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, ChevronLeft } from "lucide-react";

interface NavItem { label: string; href: string; icon?: React.ReactNode }

interface NavProps {
  items: NavItem[];
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  settingsNode?: React.ReactNode;
}

export function TopNav({ items, title, subtitle, backHref, backLabel, settingsNode }: NavProps) {
  const pathname = usePathname();
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 shrink-0">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">{backLabel ?? "Voltar"}</span>
              </Button>
            </Link>
          )}
          <div>
            <p className="font-semibold text-sm leading-none">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {settingsNode}
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              pathname === item.href
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-40 safe-area-pb">
      <div className="flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

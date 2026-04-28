"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

const THEMES = [
  { id: "light",        label: "Claro",          bg: "#ffffff", ring: "#d1d5db" },
  { id: "dark",         label: "Escuro",          bg: "#1a1a1a", ring: "#374151" },
  { id: "midnight-blue",label: "Azul Meia-Noite", bg: "#2e3a6e", ring: "#3b4db8" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setEnabled(s.themesEnabled === "true"))
      .catch(() => {});
  }, []);

  if (!mounted || !enabled) return null;

  async function handleTheme(t: string) {
    setTheme(t);
    if (session?.user?.id) {
      await fetch(`/api/users/${session.user.id}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  }

  return (
    <div className="flex items-center gap-1.5" title="Tema">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => handleTheme(t.id)}
          title={t.label}
          className="rounded-full transition-all"
          style={{
            width: 18,
            height: 18,
            background: t.bg,
            border: `2px solid ${t.ring}`,
            outline: theme === t.id ? `2px solid ${t.ring}` : "none",
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

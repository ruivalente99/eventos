"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ALL_THEMES } from "@/lib/themes";

const EMOJIS: Record<string, string[]> = {
  "Caras":   ["😀","😎","🤓","🧐","😴","🤩","😊","🤔","😏","🥳","😤","🥸","🤯","😈","👾","🤖"],
  "Animais": ["🐱","🐶","🦊","🐼","🦁","🐯","🦉","🦋","🐸","🦄","🐧","🦅","🐉","🦈","🦓","🐺"],
  "Objetos": ["🎓","🔥","⚡","💎","🌟","🏆","🎯","🚀","💡","🎭","🎪","🔮","🧩","🎲","⚔️","🛡️"],
  "Símbolos":["❤️","💙","💚","💛","🧡","💜","🖤","⭐","🌈","✨","💫","🔑","🎵","🌙","☀️","🌊"],
};

interface Props {
  userId?: string;
  userName: string;
  emoji?: string | null;
  onEmojiChange?: (emoji: string) => void;
  showEmoji?: boolean;
  allowedThemes?: string[];
}

export function UserSettingsPopover({ userId, userName, emoji, onEmojiChange, showEmoji = true, allowedThemes }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [themesEnabled, setThemesEnabled] = useState(false);
  const [tab, setTab] = useState("Caras");
  const [open, setOpen] = useState(false);

  const visibleThemes = allowedThemes
    ? ALL_THEMES.filter((t) => allowedThemes.includes(t.id))
    : ALL_THEMES.filter((t) => !t.exclusive);

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setThemesEnabled(s.themesEnabled === "true"))
      .catch(() => {});
  }, []);

  async function handleTheme(t: string) {
    setTheme(t);
    if (userId) {
      await fetch(`/api/users/${userId}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  }

  function handleEmoji(e: string) {
    onEmojiChange?.(e);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Definições" className="h-8 w-8">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end" sideOffset={8}>
        {/* User preview */}
        <div className="flex items-center gap-3 pb-3 border-b mb-3">
          <UserAvatar name={userName} emoji={emoji} size="md" />
          <div>
            <p className="font-semibold text-sm leading-none">{userName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Personalizar</p>
          </div>
        </div>

        {/* Emoji section */}
        {showEmoji && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ícone</p>
            <div className="flex gap-1 mb-2">
              {Object.keys(EMOJIS).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTab(cat)}
                  className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                    tab === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJIS[tab].map((e) => (
                <button
                  key={e}
                  onClick={() => handleEmoji(e)}
                  className={`h-7 w-7 flex items-center justify-center rounded text-base hover:bg-muted transition-colors ${
                    emoji === e ? "ring-2 ring-primary bg-muted" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Theme section */}
        {mounted && themesEnabled && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1.5">
              {visibleThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all text-xs ${
                    theme === t.id
                      ? "border-primary ring-2 ring-primary/30 bg-accent"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div
                    className="h-6 w-full rounded-md border"
                    style={{ background: t.color, borderColor: t.border }}
                  />
                  <span className="leading-none text-center">{t.icon} {t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const EMOJIS: Record<string, string[]> = {
  "Caras": ["😀","😎","🤓","🧐","😴","🤩","😊","🤔","😏","🥳","😤","🥸","🤯","😈","👾","🤖"],
  "Animais": ["🐱","🐶","🦊","🐼","🦁","🐯","🦉","🦋","🐸","🦄","🐧","🦅","🐉","🦈","🦓","🐺"],
  "Objetos": ["🎓","🔥","⚡","💎","🌟","🏆","🎯","🚀","💡","🎭","🎪","🔮","🧩","🎲","⚔️","🛡️"],
  "Símbolos": ["❤️","💙","💚","💛","🧡","💜","🖤","⭐","🌈","✨","💫","🔑","🎵","🌙","☀️","🌊"],
};

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
  size?: "sm" | "md";
}

export function EmojiPicker({ value, onChange, size = "md" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Caras");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={size === "sm" ? "h-6 w-6 text-sm" : "h-8 w-8 text-base"}
          title="Escolher emoji"
        >
          {value || "😀"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {Object.keys(EMOJIS).map((cat) => (
            <button
              key={cat}
              onClick={() => setTab(cat)}
              className={`text-xs px-2 py-1 rounded-md whitespace-nowrap transition-colors ${
                tab === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS[tab].map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onChange(emoji); setOpen(false); }}
              className={`h-7 w-7 flex items-center justify-center rounded text-base hover:bg-muted transition-colors ${
                value === emoji ? "ring-2 ring-primary bg-muted" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function EventDixitToggle({ eventId, initialAllowDixit }: { eventId: string; initialAllowDixit: boolean }) {
  const [allowed, setAllowed] = useState(initialAllowDixit);

  async function toggle(value: boolean) {
    setAllowed(value);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowDixit: value }),
    });
    if (!res.ok) {
      setAllowed(!value);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
      return;
    }
    toast({ title: value ? "Botão DIXIT ativado" : "Botão DIXIT desativado" });
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div>
        <Label className="font-semibold">Botão DIXIT 🃏</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Permite ao júri atribuir pontuação máxima a um curso com um clique
        </p>
      </div>
      <Switch checked={allowed} onCheckedChange={toggle} />
    </div>
  );
}

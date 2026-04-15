"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export function EventActiveToggle({ eventId, initialActive }: { eventId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);

  async function toggle(value: boolean) {
    setActive(value);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: value }),
    });
    if (!res.ok) {
      setActive(!value); // revert
      toast({ title: "Erro ao atualizar estado", variant: "destructive" });
      return;
    }
    toast({ title: value ? "Evento ativado" : "Evento desativado" });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={active} onCheckedChange={toggle} />
      <Badge variant={active ? "success" : "secondary"}>{active ? "Ativo" : "Inativo"}</Badge>
    </div>
  );
}

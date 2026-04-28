"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [themesEnabled, setThemesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setThemesEnabled(s.themesEnabled === "true");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(value: boolean) {
    setThemesEnabled(value);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "themesEnabled", value: String(value) }),
    });
    if (!res.ok) {
      setThemesEnabled(!value);
      toast({ title: "Erro ao guardar definição", variant: "destructive" });
    } else {
      toast({ title: value ? "Temas ativados" : "Temas desativados" });
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Definições</h2>
        <p className="text-sm text-muted-foreground">Configurações globais da plataforma</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-sm">Aparência</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="themes-toggle" className="text-sm font-medium">Seleção de temas</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permite que júris e utilizadores escolham o tema visual (Claro, Escuro, Azul Meia-Noite)
              </p>
            </div>
            <Switch
              id="themes-toggle"
              checked={themesEnabled}
              onCheckedChange={toggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

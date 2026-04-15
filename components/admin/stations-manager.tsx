"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, MapPin } from "lucide-react";

interface Station { id: string; name: string; weight: number; active: boolean }

export function StationsManager({ eventId, initialStations }: { eventId: string; initialStations: Station[] }) {
  const [stations, setStations] = useState(initialStations);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const [loading, setLoading] = useState(false);

  async function addStation() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, weight: parseFloat(weight) }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro", variant: "destructive" }); return; }
    const station = await res.json();
    setStations([...stations, station].sort((a, b) => a.name.localeCompare(b.name)));
    setName(""); setWeight("1");
    toast({ title: "Posto adicionado!" });
  }

  async function updateWeight(id: string, w: number) {
    await fetch(`/api/events/${eventId}/stations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: w }),
    });
    setStations(stations.map((s) => (s.id === id ? { ...s, weight: w } : s)));
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/events/${eventId}/stations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setStations(stations.map((s) => (s.id === id ? { ...s, active } : s)));
  }

  async function deleteStation(id: string) {
    if (!confirm("Apagar posto? As avaliações associadas serão perdidas.")) return;
    await fetch(`/api/events/${eventId}/stations/${id}`, { method: "DELETE" });
    setStations(stations.filter((s) => s.id !== id));
  }

  const totalWeight = stations.filter((s) => s.active).reduce((sum, s) => sum + s.weight, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Postos de Avaliação</h2>
        <p className="text-sm text-muted-foreground">Peso total ativo: {totalWeight.toFixed(1)}</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Nome do posto" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Input type="number" placeholder="Peso" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-20" min="0" step="0.1" />
        <Button onClick={addStation} disabled={!name.trim() || loading}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-2">
        {stations.map((station) => (
          <Card key={station.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{station.name}</p>
                  <p className="text-xs text-muted-foreground">Peso: {station.weight}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={station.weight}
                      onChange={(e) => updateWeight(station.id, parseFloat(e.target.value))}
                      className="w-16 h-7 text-sm"
                      min="0" step="0.1"
                    />
                  </div>
                  <Switch checked={station.active} onCheckedChange={(v) => toggleActive(station.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => deleteStation(station.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {stations.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Nenhum posto configurado.</p>}
      </div>
    </div>
  );
}

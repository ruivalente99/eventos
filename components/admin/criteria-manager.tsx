"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Criterion { id: string; name: string; code: string; weight: number; minScore: number; maxScore: number; type: string; active: boolean; displayOrder: number }

export function CriteriaManager({ eventId, initialCriteria }: { eventId: string; initialCriteria: Criterion[] }) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY" });
  const [loading, setLoading] = useState(false);

  async function addCriterion() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, weight: parseFloat(form.weight), minScore: parseInt(form.minScore), maxScore: parseInt(form.maxScore) }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro", variant: "destructive" }); return; }
    const c = await res.json();
    setCriteria([...criteria, c]);
    setOpen(false);
    setForm({ name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY" });
    toast({ title: "Critério adicionado!" });
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/events/${eventId}/criteria/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  async function updateWeight(id: string, weight: number) {
    await fetch(`/api/events/${eventId}/criteria/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight }),
    });
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, weight } : c)));
  }

  async function deleteCriterion(id: string) {
    if (!confirm("Apagar critério?")) return;
    await fetch(`/api/events/${eventId}/criteria/${id}`, { method: "DELETE" });
    setCriteria(criteria.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Critérios de Avaliação</h2>
          <p className="text-sm text-muted-foreground">{criteria.filter((c) => c.active).length} ativos</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="space-y-2">
        {criteria.map((c) => (
          <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{c.code}</Badge>
                    <Badge variant={c.type === "BONUS" ? "warning" : "secondary"} className="text-xs">{c.type === "BONUS" ? "Bónus" : "Categoria"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Intervalo: {c.minScore}–{c.maxScore}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Peso</span>
                    <Input
                      type="number"
                      value={c.weight}
                      onChange={(e) => updateWeight(c.id, parseFloat(e.target.value))}
                      className="w-16 h-7 text-sm"
                      min="0" step="0.1"
                    />
                  </div>
                  <Switch checked={c.active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => deleteCriterion(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {criteria.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Nenhum critério configurado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Critério</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tema / Sátira" /></div>
              <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="TEMA" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Peso</Label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} min="0" step="0.1" /></div>
              <div className="space-y-2"><Label>Mínimo</Label><Input type="number" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} /></div>
              <div className="space-y-2"><Label>Máximo</Label><Input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CATEGORY">Categoria</SelectItem>
                  <SelectItem value="BONUS">Bónus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addCriterion} disabled={!form.name || !form.code || loading}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

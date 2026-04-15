"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { codeFromName } from "@/lib/utils";

interface Criterion {
  id: string; name: string; code: string; weight: number;
  minScore: number; maxScore: number; type: string; active: boolean; displayOrder: number;
}

export function CriteriaManager({ eventId, initialCriteria }: { eventId: string; initialCriteria: Criterion[] }) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY" });
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Criterion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  async function addCriterion() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        weight: parseFloat(form.weight),
        minScore: parseInt(form.minScore),
        maxScore: parseInt(form.maxScore),
      }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao adicionar critério", variant: "destructive" }); return; }
    const c = await res.json();
    setCriteria([...criteria, c]);
    setOpen(false);
    setForm({ name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY" });
    setCodeManuallyEdited(false);
    toast({ title: "Critério adicionado!" });
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/events/${eventId}/criteria/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
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

  async function move(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= criteria.length) return;

    const a = criteria[index];
    const b = criteria[targetIndex];

    const newOrder = [...criteria];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCriteria(newOrder); // optimistic

    setReordering(true);
    await Promise.all([
      fetch(`/api/events/${eventId}/criteria/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: b.displayOrder }),
      }),
      fetch(`/api/events/${eventId}/criteria/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: a.displayOrder }),
      }),
    ]);
    setReordering(false);
    // Update local display orders too
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.id === a.id) return { ...c, displayOrder: b.displayOrder };
        if (c.id === b.id) return { ...c, displayOrder: a.displayOrder };
        return c;
      })
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/events/${eventId}/criteria/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (!res.ok) { toast({ title: "Erro ao apagar critério", variant: "destructive" }); return; }
    setCriteria(criteria.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: "Critério apagado" });
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
        {criteria.map((c, index) => (
          <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {/* Order arrows */}
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => move(index, "up")}
                    disabled={index === 0 || reordering}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(index, "down")}
                    disabled={index === criteria.length - 1 || reordering}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{c.code}</Badge>
                    <Badge variant={c.type === "BONUS" ? "warning" : "secondary"} className="text-xs">
                      {c.type === "BONUS" ? "Bónus" : "Categoria"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Intervalo: {c.minScore}–{c.maxScore}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>×</span>
                    <Input
                      type="number"
                      value={c.weight}
                      onChange={(e) => updateWeight(c.id, parseFloat(e.target.value))}
                      className="w-14 h-7 text-sm"
                      min="0" step="0.1"
                    />
                  </div>
                  <Switch checked={c.active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {criteria.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum critério configurado.</p>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCodeManuallyEdited(false); setForm({ name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Critério</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      // Auto-fill code unless user has manually overridden it
                      code: codeManuallyEdited ? f.code : codeFromName(name),
                    }));
                  }}
                  placeholder="Tema / Sátira"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Código
                  {!codeManuallyEdited && <span className="text-xs text-muted-foreground">(auto)</span>}
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) => {
                    setCodeManuallyEdited(true);
                    setForm({ ...form, code: e.target.value.toUpperCase() });
                  }}
                  placeholder="TEMA"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Peso</Label>
                <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} min="0" step="0.1" />
              </div>
              <div className="space-y-2">
                <Label>Mínimo</Label>
                <Input type="number" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Máximo</Label>
                <Input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
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
            <Button onClick={addCriterion} disabled={!form.name || !form.code || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar critério</DialogTitle>
            <DialogDescription>
              Tens a certeza que queres apagar <strong>{deleteTarget?.name}</strong>?
              Todos os scores associados a este critério serão eliminados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  minScore: number; maxScore: number; type: string; active: boolean;
  displayOrder: number; parentId: string | null;
  children?: Criterion[];
}

const emptyForm = { name: "", code: "", weight: "1", minScore: "0", maxScore: "100", type: "CATEGORY", parentId: "" };

export function CriteriaManager({ eventId, initialCriteria }: { eventId: string; initialCriteria: Criterion[] }) {
  // Flat list — tree derived on render
  const [criteria, setCriteria] = useState(initialCriteria);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Criterion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  const rootCriteria = criteria.filter((c) => c.parentId === null).sort((a, b) => a.displayOrder - b.displayOrder);
  const childrenOf = (parentId: string) =>
    criteria.filter((c) => c.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);

  function openAddDialog(parentId?: string) {
    setForm({ ...emptyForm, parentId: parentId ?? "" });
    setCodeManuallyEdited(false);
    setOpen(true);
  }

  async function addCriterion() {
    setLoading(true);
    const parentId = form.parentId || null;
    const res = await fetch(`/api/events/${eventId}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        code: form.code,
        weight: parseFloat(form.weight),
        minScore: parseInt(form.minScore),
        maxScore: parseInt(form.maxScore),
        type: form.type,
        parentId,
      }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao adicionar critério", variant: "destructive" }); return; }
    const c = await res.json();
    setCriteria((prev) => [...prev, { ...c, children: [] }]);
    setOpen(false);
    setForm(emptyForm);
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
    setCriteria((prev) => prev.map((c) => c.id === id ? { ...c, active } : c));
  }

  async function updateWeight(id: string, weight: number) {
    await fetch(`/api/events/${eventId}/criteria/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight }),
    });
    setCriteria((prev) => prev.map((c) => c.id === id ? { ...c, weight } : c));
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const item = criteria.find((c) => c.id === id)!;
    const siblings = criteria
      .filter((c) => c.parentId === item.parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = siblings.findIndex((c) => c.id === id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const a = siblings[idx];
    const b = siblings[targetIdx];

    // Optimistic update
    setCriteria((prev) => prev.map((c) => {
      if (c.id === a.id) return { ...c, displayOrder: b.displayOrder };
      if (c.id === b.id) return { ...c, displayOrder: a.displayOrder };
      return c;
    }));

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
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/events/${eventId}/criteria/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (!res.ok) { toast({ title: "Erro ao apagar critério", variant: "destructive" }); return; }
    // Remove criterion and its children from local state
    setCriteria((prev) => prev.filter((c) => c.id !== deleteTarget.id && c.parentId !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: "Critério apagado" });
  }

  const deleteTargetChildCount = deleteTarget ? childrenOf(deleteTarget.id).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Critérios de Avaliação</h2>
          <p className="text-sm text-muted-foreground">{criteria.filter((c) => c.active).length} ativos</p>
        </div>
        <Button onClick={() => openAddDialog()} size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>

      <div className="space-y-2">
        {rootCriteria.map((c, rootIdx) => {
          const children = childrenOf(c.id);
          return (
            <div key={c.id} className="space-y-1">
              <CriterionRow
                criterion={c}
                isFirst={rootIdx === 0}
                isLast={rootIdx === rootCriteria.length - 1}
                reordering={reordering}
                onMove={(dir) => moveItem(c.id, dir)}
                onToggleActive={(v) => toggleActive(c.id, v)}
                onUpdateWeight={(w) => updateWeight(c.id, w)}
                onDelete={() => setDeleteTarget(c)}
                onAddChild={() => openAddDialog(c.id)}
                isRoot
              />
              {children.map((child, childIdx) => (
                <div key={child.id} className="ml-6">
                  <CriterionRow
                    criterion={child}
                    isFirst={childIdx === 0}
                    isLast={childIdx === children.length - 1}
                    reordering={reordering}
                    onMove={(dir) => moveItem(child.id, dir)}
                    onToggleActive={(v) => toggleActive(child.id, v)}
                    onUpdateWeight={(w) => updateWeight(child.id, w)}
                    onDelete={() => setDeleteTarget(child)}
                    isRoot={false}
                  />
                </div>
              ))}
            </div>
          );
        })}
        {rootCriteria.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum critério configurado.</p>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setCodeManuallyEdited(false); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.parentId ? "Novo Subcritério" : "Novo Critério"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {form.parentId && (
              <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
                Subcritério de: <strong>{criteria.find((c) => c.id === form.parentId)?.name}</strong>
              </div>
            )}
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
            {!form.parentId && (
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
            )}
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
              {deleteTargetChildCount > 0 && (
                <> Este critério tem <strong>{deleteTargetChildCount} subcritério{deleteTargetChildCount > 1 ? "s" : ""}</strong> que também serão apagados.</>
              )}{" "}
              Todos os scores associados serão eliminados.
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

function CriterionRow({
  criterion, isFirst, isLast, reordering, onMove, onToggleActive, onUpdateWeight, onDelete, onAddChild, isRoot,
}: {
  criterion: Criterion;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMove: (dir: "up" | "down") => void;
  onToggleActive: (v: boolean) => void;
  onUpdateWeight: (w: number) => void;
  onDelete: () => void;
  onAddChild?: () => void;
  isRoot: boolean;
}) {
  return (
    <Card className={!criterion.active ? "opacity-60" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col shrink-0">
            <button
              onClick={() => onMove("up")}
              disabled={isFirst || reordering}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={isLast || reordering}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{criterion.name}</span>
              <Badge variant="outline" className="text-xs font-mono">{criterion.code}</Badge>
              {isRoot && (
                <Badge variant={criterion.type === "BONUS" ? "warning" : "secondary"} className="text-xs">
                  {criterion.type === "BONUS" ? "Bónus" : "Categoria"}
                </Badge>
              )}
              {!isRoot && (
                <Badge variant="outline" className="text-xs text-muted-foreground">sub</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Intervalo: {criterion.minScore}–{criterion.maxScore}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>×</span>
              <Input
                type="number"
                value={criterion.weight}
                onChange={(e) => onUpdateWeight(parseFloat(e.target.value))}
                className="w-14 h-7 text-sm"
                min="0" step="0.1"
              />
            </div>
            {isRoot && onAddChild && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddChild} title="Adicionar subcritério">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            <Switch checked={criterion.active} onCheckedChange={onToggleActive} />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

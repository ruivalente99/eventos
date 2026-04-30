"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertTriangle, Pencil, ChevronUp, ChevronDown, Loader2, CheckSquare, Square, EyeOff, Eye } from "lucide-react";

interface Course {
  id: string;
  name: string;
  entryOrder: number;
  disqualified: boolean;
  hidden: boolean;
  globalCourseId?: string | null;
}
interface GlobalCourse { id: string; name: string }

export function EventCoursesManager({
  eventId,
  initialCourses,
  globalCourses,
}: {
  eventId: string;
  initialCourses: Course[];
  globalCourses: GlobalCourse[];
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedGlobals, setSelectedGlobals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"new" | "global">("new");

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Course | null>(null);
  const [editName, setEditName] = useState("");
  const [editScope, setEditScope] = useState<"event" | "global">("event");
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reorder loading
  const [reordering, setReordering] = useState(false);

  const availableGlobal = globalCourses.filter((g) => !courses.some((c) => c.name === g.name));

  async function addCourse(name: string, globalCourseId?: string) {
    const res = await fetch(`/api/events/${eventId}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, globalCourseId }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<Course>;
  }

  async function handleAddNew() {
    if (!newName.trim()) return;
    setLoading(true);
    const course = await addCourse(newName.trim());
    setLoading(false);
    if (!course) { toast({ title: "Erro ao adicionar curso", variant: "destructive" }); return; }
    setCourses((prev) => [...prev, course]);
    setOpen(false);
    setNewName("");
    toast({ title: "Curso adicionado!" });
  }

  async function handleAddSelected() {
    if (selectedGlobals.size === 0) return;
    setLoading(true);
    const toAdd = availableGlobal.filter((g) => selectedGlobals.has(g.id));
    const results = await Promise.all(toAdd.map((g) => addCourse(g.name, g.id)));
    setLoading(false);
    const added = results.filter(Boolean) as Course[];
    if (added.length < toAdd.length) {
      toast({ title: `${toAdd.length - added.length} curso(s) falharam`, variant: "destructive" });
    }
    if (added.length > 0) {
      setCourses((prev) => [...prev, ...added]);
      toast({ title: `${added.length} curso(s) adicionado(s)!` });
    }
    setOpen(false);
    setSelectedGlobals(new Set());
  }

  async function toggleDisqualified(id: string, disqualified: boolean) {
    const res = await fetch(`/api/events/${eventId}/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disqualified }),
    });
    if (!res.ok) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
    setCourses(courses.map((c) => (c.id === id ? { ...c, disqualified } : c)));
  }

  async function toggleHidden(id: string, hidden: boolean) {
    const res = await fetch(`/api/events/${eventId}/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    if (!res.ok) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
    setCourses(courses.map((c) => (c.id === id ? { ...c, hidden } : c)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/events/${eventId}/courses/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (!res.ok) { toast({ title: "Erro ao remover curso", variant: "destructive" }); return; }
    setCourses(courses.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: "Curso removido" });
  }

  async function move(activeIndex: number, direction: "up" | "down") {
    const activeList = courses.filter((c) => !c.disqualified && !c.hidden);
    const disqualifiedList = courses.filter((c) => c.disqualified && !c.hidden);
    const hiddenList = courses.filter((c) => c.hidden);
    const targetIndex = direction === "up" ? activeIndex - 1 : activeIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeList.length) return;

    const newActive = [...activeList];
    [newActive[activeIndex], newActive[targetIndex]] = [newActive[targetIndex], newActive[activeIndex]];
    const combined = [...newActive, ...disqualifiedList, ...hiddenList];
    setCourses(combined); // optimistic

    setReordering(true);
    const res = await fetch(`/api/events/${eventId}/courses/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: combined.map((c) => c.id) }),
    });
    setReordering(false);
    if (!res.ok) {
      setCourses(courses); // revert
      toast({ title: "Erro ao reordenar", variant: "destructive" });
      return;
    }
    const updated: Course[] = await res.json();
    setCourses(updated);
  }

  function openEdit(course: Course) {
    setEditTarget(course);
    setEditName(course.name);
    setEditScope("event");
  }

  async function saveEdit() {
    if (!editTarget || !editName.trim()) return;
    setEditLoading(true);

    if (editScope === "global" && editTarget.globalCourseId) {
      // Update global course name, and cascade to this event course
      const [globalRes, eventRes] = await Promise.all([
        fetch(`/api/global-courses/${editTarget.globalCourseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        }),
        fetch(`/api/events/${eventId}/courses/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        }),
      ]);
      setEditLoading(false);
      if (!globalRes.ok || !eventRes.ok) {
        toast({ title: "Erro ao atualizar nome", variant: "destructive" });
        return;
      }
      toast({ title: "Nome atualizado na lista global!" });
    } else {
      // Event-only rename: also disconnect from global course if it had one
      const body: Record<string, unknown> = { name: editName.trim() };
      if (editTarget.globalCourseId) body.globalCourseId = null;
      const res = await fetch(`/api/events/${eventId}/courses/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditLoading(false);
      if (!res.ok) { toast({ title: "Erro ao atualizar nome", variant: "destructive" }); return; }
      toast({ title: "Nome atualizado!" });
    }

    setCourses(courses.map((c) =>
      c.id === editTarget.id
        ? { ...c, name: editName.trim(), globalCourseId: editScope === "event" ? null : c.globalCourseId }
        : c
    ));
    setEditTarget(null);
  }

  const activeCourses = courses.filter((c) => !c.disqualified && !c.hidden);
  const disqualifiedCourses = courses.filter((c) => c.disqualified && !c.hidden);
  const hiddenCourses = courses.filter((c) => c.hidden);

  function CourseRow({ course, index, section }: { course: Course; index: number; section: "active" | "dq" | "hidden" }) {
    const isActive = section === "active";
    const isHidden = section === "hidden";
    const cardClass = isHidden
      ? "border-muted bg-muted/30 opacity-70"
      : !isActive
      ? "border-destructive/25 bg-destructive/5 opacity-80"
      : "";
    return (
      <Card className={cardClass}>
        <CardContent className="p-3 flex items-center gap-2">
          {isActive ? (
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
                disabled={index === activeCourses.length - 1 || reordering}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <span className="text-sm font-mono text-muted-foreground w-5 text-center shrink-0">
            {course.entryOrder}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${!isActive ? "line-through text-muted-foreground" : ""}`}>
                {course.name}
              </span>
              {course.globalCourseId && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">global</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {!isHidden && (
              <div className="flex items-center gap-1" title={isActive ? "Desqualificar" : "Requalificar"}>
                <AlertTriangle className={`h-3 w-3 ${!isActive ? "text-destructive" : "text-muted-foreground"}`} />
                <Switch
                  checked={course.disqualified}
                  onCheckedChange={(v) => toggleDisqualified(course.id, v)}
                />
              </div>
            )}
            <div className="flex items-center gap-1" title={isHidden ? "Mostrar" : "Ocultar"}>
              {isHidden ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              <Switch
                checked={course.hidden}
                onCheckedChange={(v) => toggleHidden(course.id, v)}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(course)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cursos</h2>
          <p className="text-sm text-muted-foreground">{activeCourses.length} em votação · {courses.length} total</p>
        </div>

        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Active courses */}
      <div className="space-y-2">
        {activeCourses.map((course, index) => (
          <CourseRow key={course.id} course={course} index={index} section="active" />
        ))}
        {activeCourses.length === 0 && courses.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum curso adicionado.</p>
        )}
        {activeCourses.length === 0 && courses.length > 0 && (
          <p className="text-center py-4 text-muted-foreground text-sm">Todos os cursos estão desqualificados.</p>
        )}
      </div>

      {/* Disqualified section */}
      {disqualifiedCourses.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive">
              Desqualificados ({disqualifiedCourses.length})
            </p>
            <div className="flex-1 h-px bg-destructive/20" />
          </div>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-3">
              <p className="text-xs text-destructive">
                Estes cursos não aparecem na lista de votação dos júris e são excluídos dos resultados.
              </p>
            </CardContent>
          </Card>
          {disqualifiedCourses.map((course) => (
            <CourseRow key={course.id} course={course} index={-1} section="dq" />
          ))}
        </div>
      )}
      {/* Hidden section */}
      {hiddenCourses.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-semibold text-muted-foreground">
              Ocultos ({hiddenCourses.length})
            </p>
            <div className="flex-1 h-px bg-muted" />
          </div>
          <Card className="border-muted bg-muted/20">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">
                Estes cursos não aparecem aos júris nem nos resultados, mas ficam no registo.
              </p>
            </CardContent>
          </Card>
          {hiddenCourses.map((course) => (
            <CourseRow key={course.id} course={course} index={-1} section="hidden" />
          ))}
        </div>
      )}

      {/* Add course dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Curso</DialogTitle></DialogHeader>
          <div className="flex gap-2 border rounded-lg p-1">
            <button
              onClick={() => setTab("new")}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "new" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Novo
            </button>
            <button
              onClick={() => setTab("global")}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "global" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Da lista global
            </button>
          </div>

          {tab === "new" ? (
            <div className="space-y-2">
              <Label>Nome do curso</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do curso"
                onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {availableGlobal.length > 0 && (
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="text-xs text-muted-foreground">
                    {selectedGlobals.size} selecionado{selectedGlobals.size !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedGlobals(new Set(availableGlobal.map((g) => g.id)))}
                      className="text-xs text-primary hover:underline"
                    >
                      Selecionar tudo
                    </button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <button
                      onClick={() => setSelectedGlobals(new Set())}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Remover tudo
                    </button>
                  </div>
                </div>
              )}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {availableGlobal.map((g) => {
                  const selected = selectedGlobals.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGlobals((prev) => {
                          const next = new Set(prev);
                          selected ? next.delete(g.id) : next.add(g.id);
                          return next;
                        });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${selected ? "border-primary bg-primary/5" : "hover:bg-muted border-transparent"}`}
                    >
                      {selected
                        ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        : <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <span className="text-sm">{g.name}</span>
                    </button>
                  );
                })}
                {availableGlobal.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todos os cursos globais já foram adicionados.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setSelectedGlobals(new Set()); setNewName(""); }}>
              Cancelar
            </Button>
            <Button
              disabled={loading || (tab === "new" ? !newName.trim() : selectedGlobals.size === 0)}
              onClick={() => tab === "new" ? handleAddNew() : handleAddSelected()}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tab === "global" && selectedGlobals.size > 1
                ? `Adicionar ${selectedGlobals.size}`
                : "Adicionar"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit course dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do curso"
              />
            </div>
            {editTarget?.globalCourseId && (
              <div className="space-y-2">
                <Label>Âmbito da alteração</Label>
                <div className="flex gap-2 border rounded-lg p-1">
                  <button
                    onClick={() => setEditScope("event")}
                    className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${editScope === "event" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    Só neste evento
                  </button>
                  <button
                    onClick={() => setEditScope("global")}
                    className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${editScope === "global" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    Lista global
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editScope === "global"
                    ? "Atualiza o nome na lista global de cursos."
                    : "Altera só o nome neste evento, sem afetar a lista global."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={!editName.trim() || editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover curso</DialogTitle>
            <DialogDescription>
              Tens a certeza que queres remover <strong>{deleteTarget?.name}</strong> deste evento?
              As avaliações associadas também serão eliminadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

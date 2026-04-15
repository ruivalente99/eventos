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
import { Plus, Trash2, AlertTriangle, Pencil, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

interface Course {
  id: string;
  name: string;
  entryOrder: number;
  disqualified: boolean;
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
  const [selectedGlobal, setSelectedGlobal] = useState<string>("");
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
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, globalCourseId }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao adicionar curso", variant: "destructive" }); return; }
    const course = await res.json();
    setCourses([...courses, course]);
    setOpen(false);
    setNewName("");
    setSelectedGlobal("");
    toast({ title: "Curso adicionado!" });
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

  async function move(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;

    const newOrder = [...courses];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCourses(newOrder); // optimistic

    setReordering(true);
    const res = await fetch(`/api/events/${eventId}/courses/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newOrder.map((c) => c.id) }),
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
      const res = await fetch(`/api/events/${eventId}/courses/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditLoading(false);
      if (!res.ok) { toast({ title: "Erro ao atualizar nome", variant: "destructive" }); return; }
      toast({ title: "Nome atualizado!" });
    }

    setCourses(courses.map((c) => c.id === editTarget.id ? { ...c, name: editName.trim() } : c));
    setEditTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cursos</h2>
          <p className="text-sm text-muted-foreground">{courses.length} cursos</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {courses.map((course, index) => (
          <Card key={course.id}>
            <CardContent className="p-3 flex items-center gap-2">
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
                  disabled={index === courses.length - 1 || reordering}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="text-sm font-mono text-muted-foreground w-5 text-center shrink-0">
                {course.entryOrder}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-sm ${course.disqualified ? "line-through text-muted-foreground" : ""}`}>
                    {course.name}
                  </span>
                  {course.disqualified && <Badge variant="destructive" className="text-xs">DQ</Badge>}
                  {course.globalCourseId && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">global</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  <Switch
                    checked={course.disqualified}
                    onCheckedChange={(v) => toggleDisqualified(course.id, v)}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(course)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum curso adicionado.</p>
        )}
      </div>

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
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do curso" />
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableGlobal.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGlobal(g.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedGlobal === g.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                >
                  {g.name}
                </button>
              ))}
              {availableGlobal.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todos os cursos globais já foram adicionados.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={loading || (tab === "new" ? !newName.trim() : !selectedGlobal)}
              onClick={() => {
                if (tab === "new") addCourse(newName.trim());
                else {
                  const g = globalCourses.find((x) => x.id === selectedGlobal);
                  if (g) addCourse(g.name, g.id);
                }
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
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

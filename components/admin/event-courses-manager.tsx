"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

interface Course { id: string; name: string; entryOrder: number; disqualified: boolean }
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
    await fetch(`/api/events/${eventId}/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disqualified }),
    });
    setCourses(courses.map((c) => (c.id === id ? { ...c, disqualified } : c)));
  }

  async function deleteCourse(id: string) {
    if (!confirm("Remover curso do evento?")) return;
    await fetch(`/api/events/${eventId}/courses/${id}`, { method: "DELETE" });
    setCourses(courses.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cursos</h2>
          <p className="text-sm text-muted-foreground">{courses.length} cursos</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="space-y-2">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground w-6 text-center">{course.entryOrder}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${course.disqualified ? "line-through text-muted-foreground" : ""}`}>
                    {course.name}
                  </span>
                  {course.disqualified && <Badge variant="destructive" className="text-xs">DQ</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                  <Switch
                    checked={course.disqualified}
                    onCheckedChange={(v) => toggleDisqualified(course.id, v)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteCourse(course.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum curso adicionado.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Curso</DialogTitle></DialogHeader>
          <div className="flex gap-2 border rounded-lg p-1">
            <button onClick={() => setTab("new")} className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "new" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Novo</button>
            <button onClick={() => setTab("global")} className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "global" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Da lista global</button>
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
              {availableGlobal.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Todos os cursos globais já foram adicionados.</p>}
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
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

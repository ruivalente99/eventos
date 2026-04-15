"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen } from "lucide-react";

interface GlobalCourse { id: string; name: string; createdAt: Date }

export function GlobalCoursesManager({ initialCourses }: { initialCourses: GlobalCourse[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/global-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro", variant: "destructive" }); return; }
    const course = await res.json();
    setCourses([...courses, course].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    toast({ title: "Curso adicionado!" });
  }

  async function remove(id: string) {
    if (!confirm("Remover curso da lista global?")) return;
    await fetch(`/api/global-courses/${id}`, { method: "DELETE" });
    setCourses(courses.filter((c) => c.id !== id));
    toast({ title: "Curso removido" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Cursos Globais</h2>
        <p className="text-sm text-muted-foreground">Lista base de cursos reutilizável em todos os eventos</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nome do curso"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={!name.trim() || loading}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{course.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(course.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum curso na lista global.</p>
        )}
      </div>
    </div>
  );
}

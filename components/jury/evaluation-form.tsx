"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, MapPin } from "lucide-react";

interface Criterion {
  id: string;
  name: string;
  code: string;
  weight: number;
  minScore: number;
  maxScore: number;
  type: string;
}
interface Course { id: string; name: string; entryOrder: number }
interface Station { id: string; name: string }

interface Props {
  event: { id: string; name: string; slug: string };
  course: Course;
  station: Station | null;
  criteria: Criterion[];
  existingScores: { criteriaId: string; score: number }[];
  onSaved: (evaluation: { id: string; courseId: string; stationId: string; scores: { criteriaId: string; score: number }[] }) => void;
  onBack: () => void;
  courses: Course[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function EvaluationForm({
  event, course, station, criteria, existingScores,
  onSaved, courses, currentIndex, onNavigate,
}: Props) {
  const initialScores = criteria.reduce((acc, c) => {
    const existing = existingScores.find((s) => s.criteriaId === c.id);
    acc[c.id] = existing?.score ?? c.minScore;
    return acc;
  }, {} as Record<string, number>);

  const [scores, setScores] = useState(initialScores);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(existingScores.length > 0);

  function setScore(criteriaId: string, value: number) {
    const c = criteria.find((x) => x.id === criteriaId)!;
    const clamped = Math.max(c.minScore, Math.min(c.maxScore, value));
    setScores((prev) => ({ ...prev, [criteriaId]: clamped }));
    setSaved(false);
  }

  async function saveScores(): Promise<{ id: string; courseId: string; stationId: string; scores: { criteriaId: string; score: number }[] } | null> {
    if (!station) return null;
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        courseId: course.id,
        stationId: station.id,
        scores: Object.entries(scores).map(([criteriaId, score]) => ({ criteriaId, score })),
        notes,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function submit() {
    if (!station) { toast({ title: "Sem posto atribuído", variant: "destructive" }); return; }
    setLoading(true);
    const evaluation = await saveScores();
    setLoading(false);
    if (!evaluation) { toast({ title: "Erro ao submeter", variant: "destructive" }); return; }
    setSaved(true);
    onSaved(evaluation);
    toast({ title: "Avaliação guardada!" });
  }

  async function saveAndNavigate(direction: "prev" | "next") {
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;

    if (station && !saved) {
      setSaving(true);
      const evaluation = await saveScores();
      setSaving(false);
      if (evaluation) {
        setSaved(true);
        onSaved(evaluation);
        toast({ title: "Guardado automaticamente" });
      } else {
        toast({ title: "Erro ao guardar", variant: "destructive" });
        return;
      }
    }
    onNavigate(targetIndex);
  }

  const categories = criteria.filter((c) => c.type === "CATEGORY");
  const bonuses = criteria.filter((c) => c.type === "BONUS");
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < courses.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Course navigation header */}
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="flex items-center gap-2 px-3 h-12 max-w-lg mx-auto w-full">
          <Button
            variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => saveAndNavigate("prev")}
            disabled={!hasPrev || saving}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center min-w-0">
            <p className="font-semibold text-sm leading-none truncate">{course.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-2">
              <span>{currentIndex + 1} / {courses.length}</span>
              {station && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{station.name}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => saveAndNavigate("next")}
            disabled={!hasNext || saving}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {saving && (
          <div className="px-4 pb-2 flex items-center gap-2 text-xs text-muted-foreground max-w-lg mx-auto w-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            A guardar...
          </div>
        )}
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-24">
        {!station && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Não tens posto atribuído. Contacta o administrador.
            </CardContent>
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {categories.map((c) => (
                <ScoreInput
                  key={c.id}
                  criterion={c}
                  totalWeight={totalWeight}
                  value={scores[c.id] ?? c.minScore}
                  onChange={(v) => setScore(c.id, v)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {bonuses.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Bónus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {bonuses.map((c) => (
                <ScoreInput
                  key={c.id}
                  criterion={c}
                  totalWeight={totalWeight}
                  value={scores[c.id] ?? c.minScore}
                  onChange={(v) => setScore(c.id, v)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea
            placeholder="Observações..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {saved && <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />}
          <Button className="flex-1" onClick={submit} disabled={loading || !station}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {saved ? "Atualizar Avaliação" : "Submeter Avaliação"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScoreInput({
  criterion,
  totalWeight,
  value,
  onChange,
}: {
  criterion: Criterion;
  totalWeight: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [error, setError] = useState("");

  const range = criterion.maxScore - criterion.minScore;
  const pct = range > 0 ? ((value - criterion.minScore) / range) * 100 : 0;
  const contribution = totalWeight > 0 ? Math.round((criterion.weight / totalWeight) * 100) : 0;
  const isHighWeight = criterion.weight >= 1.5;

  function handleInputChange(raw: string) {
    setInputValue(raw);
    const num = parseFloat(raw);
    if (raw === "" || isNaN(num)) {
      setError("Valor inválido");
      return;
    }
    if (num < criterion.minScore || num > criterion.maxScore) {
      setError(`Entre ${criterion.minScore} e ${criterion.maxScore}`);
      onChange(Math.max(criterion.minScore, Math.min(criterion.maxScore, Math.round(num))));
      return;
    }
    setError("");
    onChange(Math.round(num));
  }

  function handleInputBlur() {
    setInputValue(String(value));
    setError("");
  }

  function nudge(delta: number) {
    const next = Math.max(criterion.minScore, Math.min(criterion.maxScore, value + delta));
    onChange(next);
    setInputValue(String(next));
    setError("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Label className={`text-sm ${isHighWeight ? "font-semibold" : ""}`}>
            {criterion.name}
          </Label>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 h-4 ${isHighWeight ? "border-primary/50 text-primary" : ""}`}
            >
              ×{criterion.weight}
            </Badge>
            <span className="text-xs text-muted-foreground">{contribution}% do total</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => nudge(-1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-muted"
          >
            −
          </button>
          <Input
            type="number"
            min={criterion.minScore}
            max={criterion.maxScore}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            className={`w-16 text-center text-xl font-bold tabular-nums h-8 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${error ? "border-destructive" : ""}`}
          />
          <button
            onClick={() => nudge(1)}
            className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-muted"
          >
            +
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        type="range"
        min={criterion.minScore}
        max={criterion.maxScore}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          onChange(v);
          setInputValue(String(v));
          setError("");
        }}
        className="w-full h-2 rounded-full appearance-none bg-secondary cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{criterion.minScore}</span>
        <span>{criterion.maxScore}</span>
      </div>
    </div>
  );
}

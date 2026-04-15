"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle, MapPin } from "lucide-react";

interface Criterion { id: string; name: string; code: string; weight: number; minScore: number; maxScore: number; type: string }
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
}

export function EvaluationForm({ event, course, station, criteria, existingScores, onSaved, onBack }: Props) {
  const initialScores = criteria.reduce((acc, c) => {
    const existing = existingScores.find((s) => s.criteriaId === c.id);
    acc[c.id] = existing?.score ?? c.minScore;
    return acc;
  }, {} as Record<string, number>);

  const [scores, setScores] = useState(initialScores);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function setScore(criteriaId: string, value: number) {
    const c = criteria.find((x) => x.id === criteriaId)!;
    const clamped = Math.max(c.minScore, Math.min(c.maxScore, value));
    setScores({ ...scores, [criteriaId]: clamped });
  }

  async function submit() {
    if (!station) { toast({ title: "Sem posto atribuído", variant: "destructive" }); return; }
    setLoading(true);
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
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao submeter", variant: "destructive" }); return; }
    const evaluation = await res.json();
    setSaved(true);
    toast({ title: "Avaliação guardada!" });
    setTimeout(() => onSaved(evaluation), 800);
  }

  const categories = criteria.filter((c) => c.type === "CATEGORY");
  const bonuses = criteria.filter((c) => c.type === "BONUS");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <p className="font-semibold text-sm leading-none line-clamp-1">{course.name}</p>
            {station && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{station.name}</p>}
          </div>
          {saved && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-24">
        {!station && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">Não tens posto atribuído. Contacta o administrador.</CardContent>
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Categorias</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {categories.map((c) => (
                <ScoreSlider key={c.id} criterion={c} value={scores[c.id] ?? c.minScore} onChange={(v) => setScore(c.id, v)} />
              ))}
            </CardContent>
          </Card>
        )}

        {bonuses.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Bónus</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {bonuses.map((c) => (
                <ScoreSlider key={c.id} criterion={c} value={scores[c.id] ?? c.minScore} onChange={(v) => setScore(c.id, v)} />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea placeholder="Observações..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-lg mx-auto">
          <Button className="w-full" onClick={submit} disabled={loading || !station}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved ? "Guardado!" : existingScores.length > 0 ? "Atualizar Avaliação" : "Submeter Avaliação"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScoreSlider({ criterion, value, onChange }: { criterion: Criterion; value: number; onChange: (v: number) => void }) {
  const range = criterion.maxScore - criterion.minScore;
  const pct = range > 0 ? ((value - criterion.minScore) / range) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{criterion.name}</Label>
        <div className="flex items-center gap-2">
          <button onClick={() => onChange(value - 1)} className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-muted">−</button>
          <span className="text-xl font-bold tabular-nums w-12 text-center">{value}</span>
          <button onClick={() => onChange(value + 1)} className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium hover:bg-muted">+</button>
        </div>
      </div>
      <input
        type="range"
        min={criterion.minScore}
        max={criterion.maxScore}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-secondary cursor-pointer"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)` }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{criterion.minScore}</span>
        <span>{criterion.maxScore}</span>
      </div>
    </div>
  );
}

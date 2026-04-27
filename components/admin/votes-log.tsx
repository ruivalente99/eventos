"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Search, User, BookOpen, MapPin, Trash2, Loader2 } from "lucide-react";

interface Score {
  criteriaId: string;
  score: number;
  criteria: { name: string; weight: number; maxScore: number };
}
interface Evaluation {
  id: string;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  juror: { id: string; name: string };
  course: { id: string; name: string; entryOrder: number };
  station: { id: string; name: string };
  scores: Score[];
}

interface Props {
  evaluations: Evaluation[];
  eventId?: string;
  jurors?: { id: string; name: string }[];
  stations?: { id: string; name: string }[];
  courses?: { id: string; name: string; entryOrder: number }[];
}

type ClearMode = "user" | "course" | "station" | "all" | null;

export function VotesLog({ evaluations, eventId, jurors = [], stations = [], courses = [] }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Clear votes state
  const [clearMode, setClearMode] = useState<ClearMode>(null);
  const [clearTarget, setClearTarget] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = evaluations.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.juror.name.toLowerCase().includes(q) ||
      e.course.name.toLowerCase().includes(q) ||
      e.station.name.toLowerCase().includes(q)
    );
  });

  const totalWeighted = (scores: Score[]) => {
    const sum = scores.reduce((s, sc) => s + sc.score * sc.criteria.weight, 0);
    const maxSum = scores.reduce((s, sc) => s + sc.criteria.maxScore * sc.criteria.weight, 0);
    return maxSum > 0 ? ((sum / maxSum) * 100).toFixed(1) : "—";
  };

  function openClearDialog(mode: ClearMode) {
    setClearMode(mode);
    setClearTarget("");
    setConfirmText("");
  }

  async function executeClear() {
    setClearing(true);
    let url = `/api/events/${eventId}/evaluations`;
    const params = new URLSearchParams();
    if (clearMode === "user" && clearTarget) params.set("userId", clearTarget);
    else if (clearMode === "course" && clearTarget) params.set("courseId", clearTarget);
    else if (clearMode === "station" && clearTarget) params.set("stationId", clearTarget);
    if ([...params].length) url += `?${params}`;

    const res = await fetch(url, { method: "DELETE" });
    setClearing(false);
    if (!res.ok) { toast({ title: "Erro ao limpar votos", variant: "destructive" }); return; }
    const { deleted } = await res.json();
    toast({ title: `${deleted} avaliação${deleted !== 1 ? "ões" : ""} removida${deleted !== 1 ? "s" : ""}` });
    setClearMode(null);
    router.refresh();
  }

  const canExecuteClear =
    clearMode === "all"
      ? confirmText === "CONFIRMAR"
      : !!clearTarget;

  const clearLabel =
    clearMode === "user" ? "por Júri" :
    clearMode === "course" ? "por Curso" :
    clearMode === "station" ? "por Posto" : "Tudo";

  return (
    <div className="space-y-4">
      {/* Clear votes card — only shown when eventId is provided */}
      {eventId && <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Limpar Votos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openClearDialog("user")} disabled={jurors.length === 0}>
              Por Júri
            </Button>
            <Button variant="outline" size="sm" onClick={() => openClearDialog("course")} disabled={courses.length === 0}>
              Por Curso
            </Button>
            <Button variant="outline" size="sm" onClick={() => openClearDialog("station")} disabled={stations.length === 0}>
              Por Posto
            </Button>
            <Button variant="destructive" size="sm" onClick={() => openClearDialog("all")}>
              Tudo
            </Button>
          </div>
        </CardContent>
      </Card>}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por júri, curso ou posto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} registo{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum registo encontrado.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((e) => {
          const open = expanded.has(e.id);
          return (
            <Card key={e.id} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggle(e.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground text-xs mr-1">#{e.course.entryOrder}</span>
                          {e.course.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />{e.juror.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{e.station.name}
                        </span>
                        <span>{new Date(e.updatedAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {totalWeighted(e.scores)}%
                      </Badge>
                      {open
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </CardContent>
              </button>

              {open && (
                <div className="border-t px-4 pb-4 pt-3 space-y-2 bg-muted/30">
                  {e.scores.map((sc) => (
                    <div key={sc.criteriaId} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-muted-foreground flex-1 min-w-0 truncate">{sc.criteria.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">×{sc.criteria.weight}</Badge>
                        <span className="font-semibold tabular-nums w-16 text-right">
                          {sc.score} / {sc.criteria.maxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                  {e.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2 italic">{e.notes}</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Clear dialog */}
      <Dialog open={clearMode !== null} onOpenChange={(v) => !v && setClearMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar votos {clearLabel}</DialogTitle>
            <DialogDescription>
              {clearMode === "all"
                ? "Esta ação remove TODAS as avaliações deste evento. Irreversível."
                : `Seleciona o ${clearMode === "user" ? "júri" : clearMode === "course" ? "curso" : "posto"} cujas avaliações serão removidas.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {clearMode === "user" && (
              <div className="space-y-1.5">
                <Label>Júri</Label>
                <Select value={clearTarget} onValueChange={setClearTarget}>
                  <SelectTrigger><SelectValue placeholder="Selecionar júri..." /></SelectTrigger>
                  <SelectContent>
                    {jurors.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {clearMode === "course" && (
              <div className="space-y-1.5">
                <Label>Curso</Label>
                <Select value={clearTarget} onValueChange={setClearTarget}>
                  <SelectTrigger><SelectValue placeholder="Selecionar curso..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>#{c.entryOrder} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {clearMode === "station" && (
              <div className="space-y-1.5">
                <Label>Posto</Label>
                <Select value={clearTarget} onValueChange={setClearTarget}>
                  <SelectTrigger><SelectValue placeholder="Selecionar posto..." /></SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {clearMode === "all" && (
              <div className="space-y-1.5">
                <Label>Escreve <strong>CONFIRMAR</strong> para continuar</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRMAR"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClearMode(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={executeClear}
              disabled={!canExecuteClear || clearing}
            >
              {clearing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search, User, BookOpen, MapPin } from "lucide-react";

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

export function VotesLog({ evaluations }: { evaluations: Evaluation[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  return (
    <div className="space-y-4">
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
              <button
                className="w-full text-left"
                onClick={() => toggle(e.id)}
              >
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
    </div>
  );
}

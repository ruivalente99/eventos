"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  id: string; name: string; entryOrder: number; disqualified: boolean;
  finalScore: number;
  stations: Record<string, { score: number; weight: number; juror: string }>;
  evaluated: number;
}

interface Station { id: string; name: string; weight: number }

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-sm font-mono text-muted-foreground w-4 text-center">{rank}</span>;
}

export function LeaderboardView({ eventId, eventSlug, eventName }: { eventId: string; eventSlug: string; eventName: string }) {
  const [data, setData] = useState<{ leaderboard: LeaderboardEntry[]; stations: Station[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await fetch(`/api/events/${eventId}/leaderboard`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    setRefreshing(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  function exportExcel() {
    window.open(`/api/export?eventId=${eventId}`, "_blank");
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">A carregar...</div>;

  const stations = data?.stations ?? [];
  const entries = data?.leaderboard ?? [];
  let rank = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Classificação</h2>
          <p className="text-sm text-muted-foreground">{eventName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={exportExcel} size="sm">
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          if (!entry.disqualified) rank++;
          return (
            <Card key={entry.id} className={entry.disqualified ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {entry.disqualified ? <Badge variant="destructive" className="text-xs">DQ</Badge> : getRankIcon(rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{entry.name}</span>
                      <span className="text-lg font-bold tabular-nums">{entry.finalScore.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">#{entry.entryOrder}</p>
                    {stations.length > 0 && (
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {stations.map((s) => {
                          const st = entry.stations[s.name];
                          return (
                            <div key={s.id} className="text-xs">
                              <span className="text-muted-foreground">{s.name}: </span>
                              <span className="font-medium">{st?.score?.toFixed(1) ?? "–"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {entries.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">Nenhuma avaliação submetida ainda.</p>}
      </div>
    </div>
  );
}

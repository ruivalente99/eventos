"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, MapPin, RefreshCw } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

interface LeaderboardEntry {
  id: string;
  name: string;
  entryOrder: number;
  disqualified: boolean;
  finalScore: number;
}

interface StationStatus {
  stationId: string;
  stationName: string;
  jurors: { name: string; emoji: string | null }[];
  currentCourse: { id: string; name: string; entryOrder: number } | null;
  evaluatedCount: number;
  totalCourses: number;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400 shrink-0" />;
  return <Medal className="h-4 w-4 text-amber-600 shrink-0" />;
}

export function AdminLivePanel({ eventId }: { eventId: string }) {
  const [top3, setTop3] = useState<LeaderboardEntry[]>([]);
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [lbRes, ssRes] = await Promise.all([
        fetch(`/api/events/${eventId}/leaderboard`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/station-status`, { cache: "no-store" }),
      ]);
      const [lb, ss] = await Promise.all([lbRes.json(), ssRes.json()]);
      setTop3(
        ((lb.leaderboard ?? []) as LeaderboardEntry[])
          .filter((e) => !e.disqualified)
          .slice(0, 3)
      );
      setStations(ss as StationStatus[]);
      setLastUpdated(new Date());
    } catch {
      // silent fail — stale data stays
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Top 3 */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> Top 3
            </CardTitle>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {lastUpdated.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {top3.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma avaliação submetida ainda.</p>
          )}
          {top3.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              <RankIcon rank={i + 1} />
              <span className="flex-1 text-sm font-medium truncate">{entry.name}</span>
              <Badge variant="secondary" className="tabular-nums text-xs font-bold">
                {entry.finalScore.toFixed(1)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Station status */}
      {stations.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Postos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {stations.map((s) => (
              <div key={s.stationId} className="flex items-start gap-3">
                <div className="flex -space-x-2 shrink-0 mt-0.5">
                  {s.jurors.length === 0 && (
                    <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                      ?
                    </div>
                  )}
                  {s.jurors.map((j) => (
                    <UserAvatar key={j.name} name={j.name} emoji={j.emoji} size="sm" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{s.stationName}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.evaluatedCount}/{s.totalCourses}
                    </span>
                  </div>
                  {s.currentCourse ? (
                    <p className="text-xs text-muted-foreground truncate">
                      #{s.currentCourse.entryOrder} {s.currentCourse.name}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 font-medium">Concluído</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvaluationForm } from "@/components/jury/evaluation-form";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserSettingsPopover } from "@/components/ui/user-settings-popover";
import { computeNormalizedScore } from "@/lib/scoring";
import { LogOut, CheckCircle, Circle, ChevronRight, MapPin } from "lucide-react";

interface Course { id: string; name: string; entryOrder: number; disqualified: boolean }
interface Criterion { id: string; name: string; code: string; weight: number; minScore: number; maxScore: number; type: string; parentId: string | null; children?: Criterion[] }
interface Evaluation { id: string; courseId: string; stationId: string; scores: { criteriaId: string; score: number }[] }
interface Station { id: string; name: string }

interface Props {
  event: { id: string; name: string; slug: string };
  jurorId: string;
  jurorName: string;
  jurorEmoji?: string | null;
  eventUserId: string;
  station: Station | null;
  courses: Course[];
  criteria: Criterion[];
  initialEvaluations: Evaluation[];
  allowedThemes?: string[];
}

export function JuryDashboard({ event, jurorId, jurorName, jurorEmoji: initialEmoji, eventUserId, station, courses, criteria, initialEvaluations, allowedThemes }: Props) {
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [emoji, setEmoji] = useState(initialEmoji ?? null);

  async function updateEmoji(newEmoji: string) {
    setEmoji(newEmoji);
    await fetch(`/api/events/${event.id}/users/${eventUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: newEmoji }),
    });
  }
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const isEvaluated = (courseId: string) =>
    evaluations.some((e) => e.courseId === courseId && (station ? e.stationId === station.id : true));

  const activeCourses = courses.filter((c) => !c.disqualified);
  const evaluated = activeCourses.filter((c) => isEvaluated(c.id)).length;
  const total = activeCourses.length;

  function handleEvaluationSaved(evaluation: Evaluation) {
    setEvaluations((prev) => {
      const existing = prev.findIndex((e) => e.courseId === evaluation.courseId && e.stationId === evaluation.stationId);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = evaluation;
        return next;
      }
      return [...prev, evaluation];
    });
  }

  function handleNavigate(index: number) {
    setSelectedIndex(index);
  }

  if (selectedIndex !== null) {
    const selectedCourse = courses[selectedIndex];
    const existing = evaluations.find((e) => e.courseId === selectedCourse.id);
    return (
      <EvaluationForm
        event={event}
        course={selectedCourse}
        station={station}
        criteria={criteria}
        existingScores={existing?.scores ?? []}
        onSaved={handleEvaluationSaved}
        onBack={() => setSelectedIndex(null)}
        courses={courses}
        currentIndex={selectedIndex}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <UserAvatar name={jurorName} emoji={emoji} size="sm" />
            <div>
              <p className="font-semibold text-sm leading-none">{event.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{jurorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {station && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />{station.name}
              </Badge>
            )}
            <UserSettingsPopover
              userId={jurorId}
              userName={jurorName}
              emoji={emoji}
              onEmojiChange={updateEmoji}
              allowedThemes={allowedThemes}
            />
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: `/e/${event.slug}` })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{evaluated}/{total}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: total > 0 ? `${(evaluated / total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </header>

      {/* Course list */}
      <main className="flex-1 p-4 space-y-2 max-w-2xl mx-auto w-full">
        {evaluated === total && total > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Todas as avaliações submetidas!</p>
            </CardContent>
          </Card>
        )}

        {courses.map((course, index) => {
          const done = isEvaluated(course.id);
          const evaluation = done
            ? evaluations.find((e) => e.courseId === course.id && (station ? e.stationId === station.id : true))
            : null;
          const score = evaluation
            ? computeNormalizedScore(evaluation.scores, criteria)
            : null;
          return (
            <button
              key={course.id}
              onClick={() => !course.disqualified && setSelectedIndex(index)}
              disabled={course.disqualified}
              className="w-full text-left"
            >
              <Card className={`transition-colors ${done ? "border-green-200 bg-green-50/50" : "hover:bg-accent/50"} ${course.disqualified ? "opacity-50" : "cursor-pointer"}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-6 text-center shrink-0">{course.entryOrder}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${course.disqualified ? "line-through" : ""}`}>{course.name}</p>
                    {course.disqualified && <p className="text-xs text-destructive">Desclassificado</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {done && score !== null && (
                      <span className="text-sm font-bold tabular-nums text-green-700">{score.toFixed(1)}%</span>
                    )}
                    {done
                      ? <CheckCircle className="h-5 w-5 text-green-600" />
                      : course.disqualified
                        ? null
                        : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}

        {courses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum curso disponível.</p>
          </div>
        )}
      </main>
    </div>
  );
}

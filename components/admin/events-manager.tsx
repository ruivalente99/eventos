"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, ExternalLink, Trash2, Settings, Users, BookOpen, MapPin, Loader2 } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { slugify } from "@/lib/utils";
import Link from "next/link";

interface EventWithCount {
  id: string; name: string; slug: string; description: string | null;
  emoji?: string | null; active: boolean; createdAt: Date;
  _count: { users: number; courses: number; stations: number };
}

export function EventsManager({ initialEvents }: { initialEvents: EventWithCount[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventWithCount | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function updateEmoji(id: string, emoji: string) {
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    setEvents(events.map((e) => (e.id === id ? { ...e, emoji } : e)));
  }

  async function createEvent() {
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao criar evento", variant: "destructive" }); return; }
    const event = await res.json();
    setEvents([event, ...events]);
    setOpen(false);
    setForm({ name: "", slug: "", description: "" });
    toast({ title: "Evento criado!" });
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) { toast({ title: "Erro ao atualizar evento", variant: "destructive" }); return; }
    setEvents(events.map((e) => (e.id === id ? { ...e, active } : e)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast({ title: "Erro ao apagar evento", variant: "destructive" }); return; }
    setEvents(events.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: "Evento apagado" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Eventos</h2>
          <p className="text-sm text-muted-foreground">{events.length} eventos</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <EmojiPicker value={event.emoji ?? "📅"} onChange={(emoji) => updateEmoji(event.id, emoji)} size="sm" />
                    <h3 className="font-semibold">{event.name}</h3>
                    <Badge variant={event.active ? "success" : "secondary"}>
                      {event.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">/{event.slug}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event._count.users}</span>
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{event._count.courses}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event._count.stations}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={event.active} onCheckedChange={(v) => toggleActive(event.id, v)} />
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/e/${event.slug}/admin`}><Settings className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/e/${event.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(event)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum evento criado ainda.</p>
            <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>Criar primeiro evento</Button>
          </div>
        )}
      </div>

      {/* Create event dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Latada 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/e/</span>
                <Input
                  placeholder="latada-2026"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input placeholder="Descrição do evento" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createEvent} disabled={!form.name || !form.slug || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar evento</DialogTitle>
            <DialogDescription>
              Tens a certeza que queres apagar <strong>{deleteTarget?.name}</strong>? Todos os cursos, postos, júris e avaliações serão eliminados. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

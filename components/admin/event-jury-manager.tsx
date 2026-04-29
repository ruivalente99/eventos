"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, QrCode, Trash2, UserCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { QrDialog } from "@/components/admin/qr-dialog";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { UserAvatar } from "@/components/ui/user-avatar";

interface EventUser {
  id: string; role: string;
  emoji?: string | null;
  allowDixit?: boolean;
  allowDado?: boolean;
  user: { id: string; name: string; email: string; loginToken?: string | null };
  station: { id: string; name: string } | null;
  evaluationCount?: number;
}
interface Station { id: string; name: string }
interface AllUser { id: string; name: string; email: string }

export function EventJuryManager({
  eventId, initialUsers, stations, allUsers,
}: {
  eventId: string; initialUsers: EventUser[]; stations: Station[]; allUsers: AllUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "existing">("existing");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "JURY", stationId: "", existingUserId: "" });
  const [loading, setLoading] = useState(false);
  const [qrUser, setQrUser] = useState<{ id: string; name: string; emoji?: string | null } | null>(null);

  const notInEvent = allUsers.filter((u) => !users.some((eu) => eu.user.id === u.id));

  async function addUser() {
    setLoading(true);
    const body = tab === "existing"
      ? { existingUserId: form.existingUserId, role: form.role, stationId: form.stationId || null }
      : { name: form.name, email: form.email, password: form.password, role: form.role, stationId: form.stationId || null };

    const res = await fetch(`/api/events/${eventId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro", variant: "destructive" }); return; }
    const eu = await res.json();
    setUsers([...users, eu]);
    setOpen(false);
    setForm({ name: "", email: "", password: "", role: "JURY", stationId: "", existingUserId: "" });
    toast({ title: "Utilizador adicionado ao evento!" });
    if (tab === "new") setQrUser({ id: eu.user.id, name: eu.user.name, emoji: eu.emoji });
  }

  async function removeUser(id: string) {
    await fetch(`/api/events/${eventId}/users/${id}`, { method: "DELETE" });
    setUsers(users.filter((u) => u.id !== id));
    toast({ title: "Removido do evento" });
  }

  async function updateStation(id: string, stationId: string) {
    const res = await fetch(`/api/events/${eventId}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId: stationId || null, role: users.find((u) => u.id === id)?.role }),
    });
    const eu = await res.json();
    setUsers(users.map((u) => (u.id === id ? eu : u)));
  }

  async function updateFlag(id: string, flag: "allowDixit" | "allowDado", value: boolean) {
    const eu = users.find((u) => u.id === id);
    if (!eu) return;
    const res = await fetch(`/api/events/${eventId}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: value }),
    });
    const updated = await res.json();
    setUsers(users.map((u) => (u.id === id ? updated : u)));
  }

  async function updateEmoji(id: string, emoji: string) {
    const eu = users.find((u) => u.id === id);
    if (!eu) return;
    const res = await fetch(`/api/events/${eventId}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId: eu.station?.id || null, role: eu.role, emoji }),
    });
    const updated = await res.json();
    setUsers(users.map((u) => (u.id === id ? updated : u)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Júris & Admins</h2>
          <p className="text-sm text-muted-foreground">{users.length} membros</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="space-y-2">
        {users.map((eu) => (
          <Card key={eu.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <UserAvatar name={eu.user.name} emoji={eu.emoji} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{eu.user.name}</span>
                    <Badge variant={eu.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                      {eu.role === "ADMIN" ? "Admin" : "Júri"}
                    </Badge>
                    {eu.role === "ADMIN" && <UserCheck className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{eu.user.email}</p>
                  {eu.role === "JURY" && (
                    <div className="mt-2">
                      <Select
                        value={eu.station?.id ?? "none"}
                        onValueChange={(v) => updateStation(eu.id, v === "none" ? "" : v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Sem posto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem posto</SelectItem>
                          {stations.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground leading-none">🌟</span>
                    <Switch
                      checked={eu.allowDixit ?? false}
                      onCheckedChange={(v) => updateFlag(eu.id, "allowDixit", v)}
                      title="Botão DIXIT"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground leading-none">🎲</span>
                    <Switch
                      checked={eu.allowDado ?? false}
                      onCheckedChange={(v) => updateFlag(eu.id, "allowDado", v)}
                      title="Botão Dado"
                    />
                  </div>
                  <EmojiPicker
                    value={eu.emoji ?? "👤"}
                    onChange={(emoji) => updateEmoji(eu.id, emoji)}
                    size="sm"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setQrUser({ id: eu.user.id, name: eu.user.name, emoji: eu.emoji })}>
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeUser(eu.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar ao Evento</DialogTitle></DialogHeader>
          <div className="flex gap-2 border rounded-lg p-1">
            <button onClick={() => setTab("existing")} className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "existing" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Existente</button>
            <button onClick={() => setTab("new")} className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${tab === "new" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Novo utilizador</button>
          </div>

          {tab === "existing" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Utilizador</Label>
                <Select value={form.existingUserId} onValueChange={(v) => setForm({ ...form, existingUserId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar utilizador" /></SelectTrigger>
                  <SelectContent>
                    {notInEvent.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JURY">Júri</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Posto</Label>
              <Select value={form.stationId || "none"} onValueChange={(v) => setForm({ ...form, stationId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={addUser}
              disabled={loading || (tab === "existing" ? !form.existingUserId : !form.name || !form.email || !form.password)}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {qrUser && (
        <QrDialog
          userId={qrUser.id}
          userName={qrUser.name}
          userEmoji={qrUser.emoji}
          open={!!qrUser}
          onOpenChange={(open) => { if (!open) setQrUser(null); }}
        />
      )}
    </div>
  );
}

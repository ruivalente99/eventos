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
import { Plus, QrCode, Trash2, User, Palette } from "lucide-react";
import { QrDialog } from "@/components/admin/qr-dialog";
import { EXCLUSIVE_THEMES } from "@/lib/themes";

interface UserRecord {
  id: string; name: string; email: string; globalRole: string; createdAt: Date;
  allowedThemes: string[];
  eventRoles: { id: string; role: string; event: { name: string } }[];
}

export function UsersManager({ initialUsers }: { initialUsers: UserRecord[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", globalRole: "USER" });
  const [loading, setLoading] = useState(false);
  const [qrUser, setQrUser] = useState<{ id: string; name: string } | null>(null);
  const [themeUser, setThemeUser] = useState<UserRecord | null>(null);

  async function createUser() {
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { toast({ title: "Erro ao criar utilizador", variant: "destructive" }); return; }
    const user = await res.json();
    setUsers([...users, { ...user, eventRoles: [], allowedThemes: user.allowedThemes ?? [] }].sort((a, b) => a.name.localeCompare(b.name)));
    setOpen(false);
    setForm({ name: "", email: "", password: "", globalRole: "USER" });
    toast({ title: "Utilizador criado!" });
    setQrUser({ id: user.id, name: user.name });
  }

  async function deleteUser(id: string) {
    if (!confirm("Apagar utilizador?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setUsers(users.filter((u) => u.id !== id));
    toast({ title: "Utilizador apagado" });
  }

  async function toggleTheme(user: UserRecord, themeId: string) {
    const has = user.allowedThemes.includes(themeId);
    const next = has
      ? user.allowedThemes.filter((t) => t !== themeId)
      : [...user.allowedThemes, themeId];

    const res = await fetch(`/api/users/${user.id}/allowed-themes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedThemes: next }),
    });
    if (!res.ok) { toast({ title: "Erro ao atualizar temas", variant: "destructive" }); return; }

    const updated = await res.json();
    setUsers(users.map((u) => u.id === user.id ? { ...u, allowedThemes: updated.allowedThemes } : u));
    if (themeUser?.id === user.id) setThemeUser((prev) => prev ? { ...prev, allowedThemes: updated.allowedThemes } : null);
    toast({ title: has ? "Tema removido" : "Tema atribuído" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Utilizadores</h2>
          <p className="text-sm text-muted-foreground">{users.length} utilizadores</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" /> Novo</Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{user.name}</span>
                  {user.globalRole === "SUPER_ADMIN" && <Badge>Super Admin</Badge>}
                  {EXCLUSIVE_THEMES.filter((t) => user.allowedThemes.includes(t.id)).map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs gap-1">
                      {t.icon} {t.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                {user.eventRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {user.eventRoles.map((r) => (
                      <Badge key={r.id} variant="outline" className="text-xs">
                        {r.event.name} · {r.role === "ADMIN" ? "Admin" : "Júri"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setThemeUser(user)} title="Gerir temas">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setQrUser({ id: user.id, name: user.name })}>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create user dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Utilizador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Papel global</Label>
              <Select value={form.globalRole} onValueChange={(v) => setForm({ ...form, globalRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Utilizador</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createUser} disabled={!form.name || !form.email || !form.password || loading}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusive theme management dialog */}
      {themeUser && (
        <Dialog open={!!themeUser} onOpenChange={(o) => { if (!o) setThemeUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Temas exclusivos — {themeUser.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Ativa ou desativa temas exclusivos para este utilizador.
            </p>
            <div className="space-y-3 pt-2">
              {EXCLUSIVE_THEMES.map((t) => {
                const current = users.find((u) => u.id === themeUser.id);
                const active = current?.allowedThemes.includes(t.id) ?? false;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-md border-2"
                        style={{ background: t.color, borderColor: t.border }}
                      />
                      <div>
                        <p className="font-medium text-sm">{t.icon} {t.label}</p>
                        <p className="text-xs text-muted-foreground">Exclusivo</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => toggleTheme(current!, t.id)}
                    >
                      {active ? "Ativo" : "Inativo"}
                    </Button>
                  </div>
                );
              })}
              {EXCLUSIVE_THEMES.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem temas exclusivos definidos.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setThemeUser(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {qrUser && (
        <QrDialog
          userId={qrUser.id}
          userName={qrUser.name}
          open={!!qrUser}
          onOpenChange={(open) => { if (!open) setQrUser(null); }}
        />
      )}
    </div>
  );
}

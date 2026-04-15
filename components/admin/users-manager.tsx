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
import { Plus, Trash2, User } from "lucide-react";

interface UserRecord {
  id: string; name: string; email: string; globalRole: string; createdAt: Date;
  eventRoles: { id: string; role: string; event: { name: string } }[];
}

export function UsersManager({ initialUsers }: { initialUsers: UserRecord[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", globalRole: "USER" });
  const [loading, setLoading] = useState(false);

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
    setUsers([...users, { ...user, eventRoles: [] }].sort((a, b) => a.name.localeCompare(b.name)));
    setOpen(false);
    setForm({ name: "", email: "", password: "", globalRole: "USER" });
    toast({ title: "Utilizador criado!" });
  }

  async function deleteUser(id: string) {
    if (!confirm("Apagar utilizador?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setUsers(users.filter((u) => u.id !== id));
    toast({ title: "Utilizador apagado" });
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
              <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}

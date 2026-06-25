import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, X, ChevronDown, ChevronUp, Phone, Mail, StickyNote } from "lucide-react";

function apiReq(url: string, method: string, token: string, body?: any) {
  return fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
}

export default function ClientsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const { data: clients = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const { data: repairs = [] } = useQuery<any[]>({
    queryKey: ["/api/repairs"],
    queryFn: () => fetch("/api/repairs", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiReq("/api/clients", "POST", token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      setFormOpen(false);
      setForm({ name: "", phone: "", email: "", notes: "" });
      toast({ title: "Клиент добавлен" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.email || "").toLowerCase().includes(s);
  });

  const getClientRepairs = (clientId: number) => repairs.filter((r: any) => r.clientId === clientId);
  const getClientTotal = (clientId: number) => getClientRepairs(clientId).reduce((sum: number, r: any) => sum + (r.finalPrice || r.estimatedPrice || 0), 0);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Клиенты</h1>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Поиск по имени, телефону..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{search ? "Ничего не найдено" : "Клиентов нет"}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const clientRepairs = getClientRepairs(client.id);
            const total = getClientTotal(client.id);
            const isExpanded = expanded === client.id;
            return (
              <div key={client.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{client.name}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {client.phone && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="w-3 h-3" />{client.phone}</span>}
                        {client.email && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="w-3 h-3" />{client.email}</span>}
                      </div>
                      {client.notes && <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><StickyNote className="w-3 h-3" />{client.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{clientRepairs.length} ремонт{clientRepairs.length === 1 ? "" : clientRepairs.length < 5 ? "а" : "ов"}</p>
                      {total > 0 && <p className="text-sm text-green-600 dark:text-green-400">{total.toLocaleString("ru")} ₽</p>}
                    </div>
                  </div>
                  {clientRepairs.length > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : client.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Скрыть историю" : "История ремонтов"}
                    </button>
                  )}
                </div>
                {isExpanded && clientRepairs.length > 0 && (
                  <div className="border-t border-border bg-muted/30 divide-y divide-border">
                    {clientRepairs.map((r: any) => (
                      <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.brand} {r.model}</p>
                          <p className="text-xs text-muted-foreground">{r.issue} · {new Date(r.createdAt).toLocaleDateString("ru")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {(r.finalPrice || r.estimatedPrice) && (
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{(r.finalPrice || r.estimatedPrice).toLocaleString("ru")} ₽</p>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.status === "готово" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, createdAt: new Date().toISOString() }); }} className="space-y-3">
            <div><label className="text-sm font-medium mb-1 block">Имя *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="text-sm font-medium mb-1 block">Телефон</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Email</label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Заметки</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">{createMutation.isPending ? "Сохраняем..." : "Добавить"}</Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

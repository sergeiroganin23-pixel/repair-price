import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneOff, Plus, Search, X } from "lucide-react";

const STATUSES = ["новая", "в_работе", "готово", "отказ", "записал"] as const;
type Status = typeof STATUSES[number];

const statusColors: Record<string, string> = {
  "новая": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "в_работе": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "готово": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "отказ": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "записал": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusLabels: Record<string, string> = {
  "новая": "Новая", "в_работе": "В работе", "готово": "Готово", "отказ": "Отказ", "записал": "Записал",
};

function apiRequest(url: string, method: string, token: string, body?: any) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

// ─── Email Orders ─────────────────────────────────────────────────────────────
function EmailOrdersList() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    queryFn: () => fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/orders/${id}/status`, "PUT", token!, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/orders"] }),
    onError: () => toast({ title: "Ошибка", description: "Не удалось изменить статус", variant: "destructive" }),
  });

  const calledMutation = useMutation({
    mutationFn: ({ id, called }: { id: number; called: boolean }) =>
      apiRequest(`/api/orders/${id}/called`, "PUT", token!, { called }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/orders"] }),
  });

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.clientName || "").toLowerCase().includes(s) ||
      (o.phone || "").includes(s) ||
      (o.device || "").toLowerCase().includes(s) ||
      (o.issue || "").toLowerCase().includes(s);
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск по имени, телефону, устройству..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "Ничего не найдено" : "Заявок с почты нет"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <div key={order.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{order.clientName || "Без имени"}</p>
                  <p className="text-sm text-muted-foreground">{order.phone || "—"}</p>
                  {order.device && <p className="text-sm text-muted-foreground">{order.brand} {order.device}</p>}
                  {order.issue && <p className="text-sm mt-1">{order.issue}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleString("ru")}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] || ""}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <button
                    onClick={() => calledMutation.mutate({ id: order.id, called: !order.called })}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${order.called ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
                  >
                    {order.called ? <Phone className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}
                    {order.called ? "Прозвонил" : "Не прозвонил"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate({ id: order.id, status: s })}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${order.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Manual Orders ────────────────────────────────────────────────────────────
function ManualOrdersList() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [form, setForm] = useState({ clientName: "", phone: "", deviceType: "", brand: "", model: "", issue: "", estimatedPrice: "", masterId: "" });

  const { data: repairs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/repairs"],
    queryFn: () => fetch("/api/repairs", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/repairs/${id}`, "PUT", token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/repairs"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/repairs", "POST", token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/repairs"] });
      setFormOpen(false);
      setForm({ clientName: "", phone: "", deviceType: "", brand: "", model: "", issue: "", estimatedPrice: "", masterId: "" });
      setSelectedClient(null);
      setClientSearch("");
      toast({ title: "Заявка создана" });
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось создать заявку", variant: "destructive" }),
  });

  const filtered = repairs.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.clientName || "").toLowerCase().includes(s) ||
      (r.phone || "").includes(s) ||
      (r.brand || "").toLowerCase().includes(s) ||
      (r.model || "").toLowerCase().includes(s);
  });

  const filteredClients = clients.filter(c =>
    clientSearch ? (c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone || "").includes(clientSearch)) : true
  ).slice(0, 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    createMutation.mutate({
      ...form,
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.name || form.clientName,
      phone: selectedClient?.phone || form.phone,
      estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null,
      masterId: form.masterId ? parseInt(form.masterId) : null,
      source: "manual",
      status: "новая",
      called: false,
      createdAt: now,
      updatedAt: now,
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" />Новая заявка</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{search ? "Ничего не найдено" : "Ручных заявок нет"}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.clientName || "Без имени"}</p>
                  <p className="text-sm text-muted-foreground">{r.phone || "—"}</p>
                  {(r.brand || r.model) && <p className="text-sm text-muted-foreground">{r.brand} {r.model}</p>}
                  {r.issue && <p className="text-sm mt-1">{r.issue}</p>}
                  {r.estimatedPrice && <p className="text-sm font-medium text-green-600 dark:text-green-400">~{r.estimatedPrice.toLocaleString("ru")} ₽</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString("ru")}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || ""}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                  <button
                    onClick={() => statusMutation.mutate({ id: r.id, data: { called: !r.called } })}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${r.called ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
                  >
                    {r.called ? <Phone className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}
                    {r.called ? "Прозвонил" : "Не прозвонил"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => statusMutation.mutate({ id: r.id, data: { status: s } })}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${r.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Repair Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Новая ручная заявка</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Поиск клиента</label>
              <Input placeholder="Имя или телефон..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); }} />
              {clientSearch && !selectedClient && filteredClients.length > 0 && (
                <div className="border border-border rounded-md mt-1 divide-y divide-border">
                  {filteredClients.map(c => (
                    <button key={c.id} type="button" onClick={() => { setSelectedClient(c); setClientSearch(c.name); setForm(f => ({ ...f, clientName: c.name, phone: c.phone || "" })); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                      <span className="font-medium">{c.name}</span> {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedClient && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Клиент выбран: {selectedClient.name}</p>}
            </div>
            {!selectedClient && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Имя клиента *</label>
                  <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Телефон</label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Бренд</label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Apple, Samsung..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Модель</label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="iPhone 13..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Неисправность *</label>
              <Input value={form.issue} onChange={e => setForm(f => ({ ...f, issue: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Предварительная стоимость (₽)</label>
              <Input type="number" value={form.estimatedPrice} onChange={e => setForm(f => ({ ...f, estimatedPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Мастер</label>
              <Select value={form.masterId} onValueChange={v => setForm(f => ({ ...f, masterId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите мастера" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? "Создаём..." : "Создать заявку"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Заявки</h1>
      <Tabs defaultValue="email">
        <TabsList className="mb-4">
          <TabsTrigger value="email">С почты</TabsTrigger>
          <TabsTrigger value="manual">Ручные</TabsTrigger>
        </TabsList>
        <TabsContent value="email"><EmailOrdersList /></TabsContent>
        <TabsContent value="manual"><ManualOrdersList /></TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Phone, User, Search, Plus, Wrench, Calendar, Pencil, ChevronRight } from "lucide-react";
import type { Client, Repair } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  новая: "Новая", в_работе: "В работе", готово: "Готово", отказ: "Отказ", записал: "Записал",
};
const STATUS_COLORS: Record<string, string> = {
  новая: "bg-blue-500 text-white", в_работе: "bg-yellow-500 text-white",
  готово: "bg-green-600 text-white", отказ: "bg-red-500 text-white", записал: "bg-purple-500 text-white",
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("ru-RU"); } catch { return iso; }
}

// ─── Форма клиента ─────────────────────────────────────────────────────────────
function ClientForm({ client, onClose }: { client?: Client; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: client?.name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    notes: client?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (client) {
        return apiRequest("PUT", `/api/clients/${client.id}`, form).then(r => r.json());
      }
      return apiRequest("POST", "/api/clients", form).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: client ? "Клиент обновлён" : "Клиент добавлен" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Имя *</Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Иван Петров" />
        </div>
        <div className="space-y-1.5">
          <Label>Телефон *</Label>
          <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+7 999 000 00 00" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" type="email" />
      </div>
      <div className="space-y-1.5">
        <Label>Примечания</Label>
        <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Дополнительная информация..." />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.phone}>
          {mutation.isPending ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

// ─── Карточка клиента ──────────────────────────────────────────────────────────
function ClientDetailModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const { data: repairs = [] } = useQuery<Repair[]>({
    queryKey: ["/api/clients", client.id, "repairs"],
    queryFn: () => apiRequest("GET", `/api/clients/${client.id}/repairs`).then(r => r.json()),
  });

  const totalSpent = repairs.filter(r => r.status === "готово").reduce((sum, r) => sum + (r.finalPrice || r.estimatedPrice || 0), 0);
  const [editing, setEditing] = useState(false);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {client.name}
        </DialogTitle>
      </DialogHeader>

      {editing ? (
        <ClientForm client={client} onClose={() => setEditing(false)} />
      ) : (
        <div className="space-y-4">
          {/* Контакты */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="text-primary hover:underline font-medium">{client.phone}</a>
            </div>
            {client.email && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Email:</span>
                <span>{client.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">С {formatDate(client.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <span>Ремонтов: <strong>{repairs.length}</strong></span>
            </div>
          </div>

          {totalSpent > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
              Итого потрачено: <strong className="text-green-700 dark:text-green-400">{totalSpent.toLocaleString("ru-RU")} ₽</strong>
            </div>
          )}

          {client.notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{client.notes}</div>
          )}

          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Редактировать
          </Button>

          {/* История ремонтов */}
          <div>
            <h3 className="font-medium text-sm mb-2">История ремонтов ({repairs.length})</h3>
            {repairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ремонтов пока нет</p>
            ) : (
              <div className="space-y-2">
                {repairs.map(r => (
                  <div key={r.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-muted"}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                        <span className="font-medium">{[r.brand, r.model].filter(Boolean).join(" ") || r.deviceType || "Устройство"}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.issue && <p className="text-muted-foreground mt-1">{r.issue}</p>}
                    {(r.finalPrice || r.estimatedPrice) && (
                      <p className="font-medium text-green-600 dark:text-green-400 mt-1">
                        {(r.finalPrice || r.estimatedPrice)?.toLocaleString("ru-RU")} ₽
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DialogContent>
  );
}

// ─── Главная страница ──────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: search ? ["/api/clients", "search", search] : ["/api/clients"],
    queryFn: () => apiRequest("GET", search ? `/api/clients?q=${encodeURIComponent(search)}` : "/api/clients").then(r => r.json()),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Клиенты</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length > 0 ? `${clients.length} клиентов` : "База клиентов пуста"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5" data-testid="button-add-client">
          <Plus className="w-4 h-4" /> Добавить клиента
        </Button>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск по имени или телефону..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-clients"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium">{search ? "Клиенты не найдены" : "Клиентов пока нет"}</p>
          <p className="text-sm mt-1">Клиенты добавляются автоматически при создании заявки</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <Card
              key={client.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedClient(client)}
              data-testid={`card-client-${client.id}`}
            >
              <CardContent className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />{client.phone}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог добавления */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
          <ClientForm onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Карточка клиента */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
        </Dialog>
      )}
    </div>
  );
}

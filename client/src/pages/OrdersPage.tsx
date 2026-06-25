import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, User, MapPin, Wrench, Tag, Calendar, Globe, Plus, Pencil,
  Shield, Clock, CreditCard, Banknote, Mail, ClipboardList, Search, UserPlus, X, ChevronDown,
} from "lucide-react";
import type { Repair, Client } from "@shared/schema";

// ─── Константы ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  новая: "Новая", в_работе: "В работе", готово: "Готово", отказ: "Отказ", записал: "Записал",
};
const STATUS_COLORS: Record<string, string> = {
  новая: "bg-blue-500 text-white",
  в_работе: "bg-yellow-500 text-white",
  готово: "bg-green-600 text-white",
  отказ: "bg-red-500 text-white",
  записал: "bg-purple-500 text-white",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Поиск клиента с выпадающим списком ───────────────────────────────────────
function ClientSearch({
  value,
  onChange,
}: {
  value: { clientId?: number | null; clientName: string; phone: string };
  onChange: (v: { clientId?: number | null; clientName: string; phone: string }) => void;
}) {
  const [query, setQuery] = useState(value.clientName || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const filtered = query.trim().length >= 2
    ? clients.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.phone && c.phone.includes(query))
      )
    : [];

  // Закрываем при клике снаружи
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(client: Client) {
    onChange({ clientId: client.id, clientName: client.name, phone: client.phone || "" });
    setQuery(client.name);
    setOpen(false);
  }

  function clear() {
    onChange({ clientId: null, clientName: "", phone: "" });
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!e.target.value) onChange({ clientId: null, clientName: "", phone: "" });
            setOpen(true);
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Поиск по имени или телефону..."
          className="pl-9 pr-8"
        />
        {query && (
          <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.slice(0, 5).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="w-full flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            >
              <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <div className="font-medium">{c.name}</div>
                {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          Клиент не найден — можно создать нового ниже
        </div>
      )}
    </div>
  );
}

// ─── Форма создания ручной заявки ─────────────────────────────────────────────
function ManualRepairForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();

  // Мастера
  const { data: allUsers = [] } = useQuery<{id: number; displayName: string; role: string}[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Клиент
  const [clientData, setClientData] = useState<{
    clientId?: number | null;
    clientName: string;
    phone: string;
  }>({ clientId: null, clientName: "", phone: "" });
  const [newClient, setNewClient] = useState(false); // режим создания нового клиента

  // Поля заявки
  const [form, setForm] = useState({
    deviceType: "",
    brand: "",
    model: "",
    imei: "",
    appearance: "",
    issue: "",
    estimatedPrice: "",
    finalPrice: "",
    prepayment: "",
    deadline: "",
    warranty: "",
    masterComment: "",
    status: "новая",
    discount: "",
    masterId: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Создание клиента на лету
  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/clients", data).then(r => r.json()),
  });

  const createRepairMutation = useMutation({
    mutationFn: async (clientId: number | null) => {
      const data = {
        ...form,
        clientId,
        clientName: clientData.clientName,
        phone: clientData.phone,
        estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null,
        finalPrice: form.finalPrice ? parseFloat(form.finalPrice) : null,
        prepayment: form.prepayment ? parseFloat(form.prepayment) : null,
        source: "manual",
        masterId: form.masterId ? parseInt(form.masterId) : null,
      };
      return apiRequest("POST", "/api/repairs", data).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Заявка создана" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  async function submit() {
    if (!clientData.clientName.trim()) {
      toast({ title: "Укажите клиента", variant: "destructive" });
      return;
    }

    let clientId = clientData.clientId ?? null;

    // Если нет clientId — создаём нового клиента
    if (!clientId && clientData.clientName.trim()) {
      try {
        const created = await createClientMutation.mutateAsync({
          name: clientData.clientName.trim(),
          phone: clientData.phone.trim(),
        });
        clientId = created.id;
      } catch {
        // Если не получилось создать клиента — создаём заявку без привязки
        clientId = null;
      }
    }

    createRepairMutation.mutate(clientId);
  }

  const isLoading = createClientMutation.isPending || createRepairMutation.isPending;

  return (
    <div className="space-y-5 py-1">
      {/* Клиент */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Клиент</h3>
        <ClientSearch value={clientData} onChange={setClientData} />

        {/* Выбранный клиент */}
        {clientData.clientId && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <User className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">{clientData.clientName}</span>
              {clientData.phone && <span className="text-xs text-green-600 dark:text-green-500 ml-2">{clientData.phone}</span>}
            </div>
            <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400 shrink-0">из базы</Badge>
          </div>
        )}

        {/* Если клиент не найден — поля для нового */}
        {!clientData.clientId && clientData.clientName && (
          <div className="mt-3 space-y-3 p-3 border border-dashed border-border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserPlus className="w-4 h-4" />
              <span>Новый клиент будет создан в базе</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Имя *</Label>
                <Input
                  value={clientData.clientName}
                  onChange={e => setClientData(p => ({ ...p, clientName: e.target.value }))}
                  placeholder="Иван Петров"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Телефон</Label>
                <Input
                  value={clientData.phone}
                  onChange={e => setClientData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+7 999 000 00 00"
                />
              </div>
            </div>
          </div>
        )}

        {/* Кнопка создать нового если поиск пустой */}
        {!clientData.clientId && !clientData.clientName && (
          <button
            type="button"
            onClick={() => setClientData(p => ({ ...p, clientName: " " }))}
            className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Создать нового клиента
          </button>
        )}
      </div>

      {/* Устройство */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Устройство</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Тип устройства</Label>
            <Select value={form.deviceType} onValueChange={v => set("deviceType", v)}>
              <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {["Телефон", "Планшет", "Ноутбук", "Компьютер", "Приставка", "Часы", "Другое"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Марка</Label>
            <Input value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Apple, Samsung..." />
          </div>
          <div className="space-y-1.5">
            <Label>Модель</Label>
            <Input value={form.model} onChange={e => set("model", e.target.value)} placeholder="iPhone 13, Galaxy S22..." />
          </div>
          <div className="space-y-1.5">
            <Label>IMEI / Серийный номер</Label>
            <Input value={form.imei} onChange={e => set("imei", e.target.value)} placeholder="354321000000000" />
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Внешний вид при приёмке</Label>
          <Textarea value={form.appearance} onChange={e => set("appearance", e.target.value)} rows={2}
            placeholder="Трещина на экране, царапины на корпусе..." />
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Неисправность</Label>
          <Textarea value={form.issue} onChange={e => set("issue", e.target.value)} rows={2}
            placeholder="Не включается, разбит экран..." />
        </div>
      </div>

      {/* Финансы */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Стоимость</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Оценка ₽</Label>
            <Input type="number" value={form.estimatedPrice} onChange={e => set("estimatedPrice", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Итоговая ₽</Label>
            <Input type="number" value={form.finalPrice} onChange={e => set("finalPrice", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Предоплата ₽</Label>
            <Input type="number" value={form.prepayment} onChange={e => set("prepayment", e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Сроки и гарантия */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Сроки</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Срок выдачи</Label>
            <Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Гарантия</Label>
            <Input value={form.warranty} onChange={e => set("warranty", e.target.value)} placeholder="30 дней" />
          </div>
        </div>
      </div>

      {/* Статус и скидка */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Скидка</Label>
          <Input value={form.discount} onChange={e => set("discount", e.target.value)} placeholder="10%" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Мастер</Label>
        <Select value={form.masterId} onValueChange={v => set("masterId", v)}>
          <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Не назначен</SelectItem>
            {allUsers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Комментарий мастера</Label>
        <Textarea value={form.masterComment} onChange={e => set("masterComment", e.target.value)} rows={2}
          placeholder="Внутренние заметки..." />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={isLoading || !clientData.clientName.trim()}>
          {isLoading ? "Сохраняю..." : "Создать заказ"}
        </Button>
      </div>
    </div>
  );
}

// ─── Форма редактирования существующей заявки ─────────────────────────────────
function EditRepairForm({ repair, onClose }: { repair: Repair; onClose: () => void }) {
  const { toast } = useToast();
  const { data: allUsers = [] } = useQuery<{id: number; displayName: string; role: string}[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const [form, setForm] = useState({
    clientName: repair.clientName || "",
    phone: repair.phone || "",
    deviceType: repair.deviceType || "",
    brand: repair.brand || "",
    model: repair.model || "",
    imei: repair.imei || "",
    appearance: repair.appearance || "",
    issue: repair.issue || "",
    estimatedPrice: repair.estimatedPrice?.toString() || "",
    finalPrice: repair.finalPrice?.toString() || "",
    prepayment: repair.prepayment?.toString() || "",
    deadline: repair.deadline || "",
    warranty: repair.warranty || "",
    masterComment: repair.masterComment || "",
    status: repair.status || "новая",
    discount: repair.discount || "",
    masterId: repair.masterId?.toString() || "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null,
        finalPrice: form.finalPrice ? parseFloat(form.finalPrice) : null,
        prepayment: form.prepayment ? parseFloat(form.prepayment) : null,
        masterId: form.masterId ? parseInt(form.masterId) : null,
      };
      return apiRequest("PUT", `/api/repairs/${repair.id}`, data).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Заявка обновлена" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5 py-1">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Клиент</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Имя клиента</Label>
            <Input value={form.clientName} onChange={e => set("clientName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Телефон</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Устройство</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select value={form.deviceType} onValueChange={v => set("deviceType", v)}>
              <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {["Телефон", "Планшет", "Ноутбук", "Компьютер", "Приставка", "Часы", "Другое"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Марка</Label>
            <Input value={form.brand} onChange={e => set("brand", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Модель</Label>
            <Input value={form.model} onChange={e => set("model", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>IMEI</Label>
            <Input value={form.imei} onChange={e => set("imei", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Внешний вид</Label>
          <Textarea value={form.appearance} onChange={e => set("appearance", e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Неисправность</Label>
          <Textarea value={form.issue} onChange={e => set("issue", e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Стоимость</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Оценка ₽</Label><Input type="number" value={form.estimatedPrice} onChange={e => set("estimatedPrice", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Итоговая ₽</Label><Input type="number" value={form.finalPrice} onChange={e => set("finalPrice", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Предоплата ₽</Label><Input type="number" value={form.prepayment} onChange={e => set("prepayment", e.target.value)} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Срок выдачи</Label><Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Гарантия</Label><Input value={form.warranty} onChange={e => set("warranty", e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Скидка</Label><Input value={form.discount} onChange={e => set("discount", e.target.value)} /></div>
      </div>

      <div className="space-y-1.5">
        <Label>Мастер</Label>
        <Select value={form.masterId} onValueChange={v => set("masterId", v)}>
          <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Не назначен</SelectItem>
            {allUsers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Комментарий мастера</Label>
        <Textarea value={form.masterComment} onChange={e => set("masterComment", e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

// ─── Карточка заявки ───────────────────────────────────────────────────────────
function RepairCard({ repair, showCalled = true }: { repair: Repair; showCalled?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PUT", `/api/orders/${repair.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
  const calledMutation = useMutation({
    mutationFn: (called: boolean) => apiRequest("PUT", `/api/orders/${repair.id}/called`, { called }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const isNew = repair.status === "новая";
  const deviceLabel = [repair.brand, repair.model].filter(Boolean).join(" ") || repair.deviceType || null;

  return (
    <>
      <Card className={`border ${isNew ? "border-blue-400 dark:border-blue-600" : "border-border"}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[repair.status] || "bg-muted"}`}>
                {STATUS_LABELS[repair.status] || repair.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{formatDate(repair.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={repair.status} onValueChange={v => statusMutation.mutate(v)} disabled={statusMutation.isPending}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {repair.clientName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{repair.clientName}</span>
              </div>
            )}
            {repair.masterId != null && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-sm">Мастер #{repair.masterId}</span>
              </div>
            )}
            {repair.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${repair.phone}`} className="text-primary hover:underline font-medium">{repair.phone}</a>
              </div>
            )}
            {repair.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{repair.location}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {deviceLabel && <Badge variant="secondary" className="text-xs gap-1"><Wrench className="w-3 h-3" />{deviceLabel}</Badge>}
            {repair.imei && <Badge variant="outline" className="text-xs font-mono">IMEI: {repair.imei}</Badge>}
            {repair.issue && <Badge variant="outline" className="text-xs">{repair.issue}</Badge>}
            {repair.discount && <Badge className="text-xs bg-orange-500 text-white gap-1"><Tag className="w-3 h-3" />Скидка: {repair.discount}</Badge>}
          </div>

          {(repair.estimatedPrice || repair.finalPrice || repair.prepayment || repair.deadline || repair.warranty) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
              {(repair.finalPrice || repair.estimatedPrice) && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <Banknote className="w-3 h-3" />
                  {(repair.finalPrice || repair.estimatedPrice)?.toLocaleString("ru-RU")} ₽
                </span>
              )}
              {repair.prepayment != null && repair.prepayment > 0 && (
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />Предоплата: {repair.prepayment.toLocaleString("ru-RU")} ₽
                </span>
              )}
              {repair.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />Выдача: {new Date(repair.deadline).toLocaleDateString("ru-RU")}
                </span>
              )}
              {repair.warranty && (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />Гарантия: {repair.warranty}
                </span>
              )}
            </div>
          )}

          {repair.appearance && <p className="text-xs text-muted-foreground">Внешний вид: {repair.appearance}</p>}
          {repair.masterComment && <p className="text-xs text-muted-foreground italic">💬 {repair.masterComment}</p>}
          {repair.rawText && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Исходное сообщение</summary>
              <pre className="mt-1 whitespace-pre-wrap font-sans">{repair.rawText}</pre>
            </details>
          )}

          {/* Прозвонил — только для заявок с почты */}
          {showCalled && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Checkbox
                id={`called-${repair.id}`}
                checked={repair.called ?? false}
                onCheckedChange={v => calledMutation.mutate(!!v)}
                disabled={calledMutation.isPending}
                className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <label
                htmlFor={`called-${repair.id}`}
                className={`text-sm cursor-pointer select-none ${repair.called ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
              >
                {repair.called ? "Прозвонил" : "Не прозвонил"}
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Редактировать заявку #{repair.id}</DialogTitle></DialogHeader>
          <EditRepairForm repair={repair} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Список заявок ─────────────────────────────────────────────────────────────
function RepairList({
  repairs,
  emptyIcon,
  emptyText,
  emptySubtext,
  action,
  showCalled = true,
}: {
  repairs: Repair[];
  emptyIcon: string;
  emptyText: string;
  emptySubtext: string;
  action?: React.ReactNode;
  showCalled?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusCounts = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = repairs.filter(r => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = statusFilter === "all" ? repairs : repairs.filter(r => r.status === statusFilter);

  return (
    <div>
      {/* Фильтр по статусам */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Все ({repairs.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([v, l]) => statusCounts[v] > 0 && (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === v
                ? `${STATUS_COLORS[v]} opacity-100`
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {l} ({statusCounts[v]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">{emptyIcon}</div>
          <p className="font-medium">{statusFilter === "all" ? emptyText : `Нет заявок со статусом "${STATUS_LABELS[statusFilter]}"`}</p>
          <p className="text-sm mt-1">{statusFilter === "all" ? emptySubtext : ""}</p>
          {action && statusFilter === "all" && <div className="mt-4">{action}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => <RepairCard key={r.id} repair={r} showCalled={showCalled} />)}
        </div>
      )}
    </div>
  );
}

// ─── Главная страница ──────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [tab, setTab] = useState<"email" | "manual">("email");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: repairs = [], isLoading } = useQuery<Repair[]>({
    queryKey: ["/api/repairs"],
    refetchInterval: 30_000,
  });

  const emailRepairs = repairs.filter(r => r.source === "email");
  const manualRepairs = repairs.filter(r => r.source === "manual" || !r.source);

  const emailNew = emailRepairs.filter(r => r.status === "новая").length;
  const manualNew = manualRepairs.filter(r => r.status === "новая").length;

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Заявки</h1>
        {tab === "manual" && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-repair">
            <Plus className="w-4 h-4" /> Новый заказ
          </Button>
        )}
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5 w-fit">
        <button
          onClick={() => setTab("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "email"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="w-4 h-4" />
          С почты
          {emailNew > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-blue-500 text-white text-xs font-bold">
              {emailNew}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "manual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Заказы
          {manualNew > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-blue-500 text-white text-xs font-bold">
              {manualNew}
            </span>
          )}
        </button>
      </div>

      {/* Счётчик */}
      <p className="text-sm text-muted-foreground mb-4">
        {tab === "email"
          ? `${emailRepairs.length} заявок${emailNew > 0 ? ` · ${emailNew} новых` : ""}`
          : `${manualRepairs.length} заявок${manualNew > 0 ? ` · ${manualNew} новых` : ""}`}
      </p>

      {/* Контент */}
      {tab === "email" ? (
        <RepairList
          repairs={emailRepairs}
          emptyIcon="📧"
          emptyText="Заявок с почты нет"
          emptySubtext="Они появятся автоматически при получении письма"
        />
      ) : (
        <RepairList
          repairs={manualRepairs}
          emptyIcon="📋"
          emptyText="Заказов нет"
          emptySubtext="Создайте первый заказ для клиента"
          showCalled={false}
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Новый заказ
            </Button>
          }
        />
      )}

      {/* Диалог создания */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Новый заказ</DialogTitle></DialogHeader>
          <ManualRepairForm onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

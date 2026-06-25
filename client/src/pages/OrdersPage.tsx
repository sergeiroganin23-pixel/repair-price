import { useState } from "react";
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
import { Phone, User, MapPin, Wrench, Tag, Calendar, Globe, Plus, Pencil, X, Shield, Clock, CreditCard, DollarSign } from "lucide-react";
import type { Repair } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  новая: "Новая", в_работе: "В работе", готово: "Готово", отказ: "Отказ", записал: "Записал",
};
const STATUS_COLORS: Record<string, string> = {
  новая: "bg-blue-500 text-white", в_работе: "bg-yellow-500 text-white",
  готово: "bg-green-600 text-white", отказ: "bg-red-500 text-white", записал: "bg-purple-500 text-white",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

// ─── Форма создания/редактирования заявки ─────────────────────────────────────
function RepairForm({ repair, onClose }: { repair?: Repair; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    clientName: repair?.clientName || "",
    phone: repair?.phone || "",
    deviceType: repair?.deviceType || "",
    brand: repair?.brand || "",
    model: repair?.model || "",
    imei: repair?.imei || "",
    appearance: repair?.appearance || "",
    issue: repair?.issue || "",
    estimatedPrice: repair?.estimatedPrice?.toString() || "",
    finalPrice: repair?.finalPrice?.toString() || "",
    prepayment: repair?.prepayment?.toString() || "",
    deadline: repair?.deadline || "",
    warranty: repair?.warranty || "",
    masterComment: repair?.masterComment || "",
    status: repair?.status || "новая",
    discount: repair?.discount || "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : null,
        finalPrice: form.finalPrice ? parseFloat(form.finalPrice) : null,
        prepayment: form.prepayment ? parseFloat(form.prepayment) : null,
      };
      if (repair) {
        return apiRequest("PUT", `/api/repairs/${repair.id}`, data).then(r => r.json());
      }
      return apiRequest("POST", "/api/repairs", data).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: repair ? "Заявка обновлена" : "Заявка создана" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5 py-1">
      {/* Клиент */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Клиент</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Имя клиента *</Label>
            <Input value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Иван Петров" />
          </div>
          <div className="space-y-1.5">
            <Label>Телефон</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 999 000 00 00" />
          </div>
        </div>
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
          <Textarea value={form.appearance} onChange={e => set("appearance", e.target.value)} rows={2} placeholder="Трещина на экране, царапины на корпусе..." />
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Неисправность</Label>
          <Textarea value={form.issue} onChange={e => set("issue", e.target.value)} rows={2} placeholder="Не включается, разбит экран..." />
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

      {/* Статус и комментарий */}
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
        <Label>Комментарий мастера</Label>
        <Textarea value={form.masterComment} onChange={e => set("masterComment", e.target.value)} rows={2} placeholder="Внутренние заметки..." />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.clientName}>
          {mutation.isPending ? "Сохраняю..." : repair ? "Обновить" : "Создать заявку"}
        </Button>
      </div>
    </div>
  );
}

// ─── Карточка заявки ───────────────────────────────────────────────────────────
function RepairCard({ repair }: { repair: Repair }) {
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
  const price = repair.finalPrice || repair.estimatedPrice;

  return (
    <>
      <Card className={`border ${isNew ? "border-blue-400 dark:border-blue-600" : "border-border"}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[repair.status] || "bg-muted"}`}>
                {STATUS_LABELS[repair.status] || repair.status}
              </span>
              {repair.source === "email" && (
                <Badge variant="outline" className="text-xs">из почты</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{formatDate(repair.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={repair.status} onValueChange={v => statusMutation.mutate(v)} disabled={statusMutation.isPending}>
                <SelectTrigger data-testid={`select-status-${repair.id}`} className="h-7 text-xs w-36">
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

          {/* Устройство */}
          <div className="flex flex-wrap gap-1.5">
            {deviceLabel && <Badge variant="secondary" className="text-xs gap-1"><Wrench className="w-3 h-3" />{deviceLabel}</Badge>}
            {repair.imei && <Badge variant="outline" className="text-xs font-mono">IMEI: {repair.imei}</Badge>}
            {repair.issue && <Badge variant="outline" className="text-xs">{repair.issue}</Badge>}
            {repair.discount && <Badge className="text-xs bg-orange-500 text-white gap-1"><Tag className="w-3 h-3" />Скидка: {repair.discount}</Badge>}
          </div>

          {/* Финансы, сроки, гарантия */}
          {(repair.estimatedPrice || repair.finalPrice || repair.prepayment || repair.deadline || repair.warranty) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
              {(repair.finalPrice || repair.estimatedPrice) && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <DollarSign className="w-3 h-3" />
                  {(repair.finalPrice || repair.estimatedPrice)?.toLocaleString("ru-RU")} ₽
                </span>
              )}
              {repair.prepayment && repair.prepayment > 0 && (
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

          {repair.appearance && (
            <p className="text-xs text-muted-foreground">Внешний вид: {repair.appearance}</p>
          )}
          {repair.masterComment && (
            <p className="text-xs text-muted-foreground italic">💬 {repair.masterComment}</p>
          )}

          {/* Прозвонил */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Checkbox
              id={`called-${repair.id}`}
              checked={repair.called}
              onCheckedChange={v => calledMutation.mutate(!!v)}
              disabled={calledMutation.isPending}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            <label htmlFor={`called-${repair.id}`}
              className={`text-sm cursor-pointer select-none ${repair.called ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
              {repair.called ? "Прозвонил" : "Не прозвонил"}
            </label>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Редактировать заявку #{repair.id}</DialogTitle></DialogHeader>
          <RepairForm repair={repair} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Главная страница ──────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: repairs = [], isLoading } = useQuery<Repair[]>({
    queryKey: ["/api/repairs"],
    refetchInterval: 30_000,
  });

  const newCount = repairs.filter(r => r.status === "новая").length;

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Заявки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {repairs.length === 0 ? "Заявок пока нет" : `Всего: ${repairs.length}${newCount > 0 ? ` · Новых: ${newCount}` : ""}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-repair">
          <Plus className="w-4 h-4" /> Новая заявка
        </Button>
      </div>

      {repairs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">Заявок нет</p>
          <p className="text-sm mt-1">Создайте заявку вручную или она появится из почты</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repairs.map(r => <RepairCard key={r.id} repair={r} />)}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Новая заявка</DialogTitle></DialogHeader>
          <RepairForm onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

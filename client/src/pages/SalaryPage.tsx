import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Circle, Trash2, TrendingUp, TrendingDown, Banknote } from "lucide-react";

const SALARY_TYPES = [
  { value: "salary", label: "Зарплата", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "bonus", label: "Премия", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "penalty", label: "Штраф", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "transfer", label: "Перевод" },
];

function apiReq(url: string, method: string, token: string, body?: any) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

function getPeriod(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatPeriod(period: string) {
  const [y, m] = period.split("-");
  const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ─── Master Salary Card ───────────────────────────────────────────────────────
function MasterCard({ master, period, token }: { master: any; period: string; token: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: totals } = useQuery<any>({
    queryKey: ["/api/salaries/totals", master.id, period],
    queryFn: () => fetch(`/api/salaries/totals?masterId=${master.id}&period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["/api/salaries", master.id, period],
    queryFn: () => fetch(`/api/salaries?masterId=${master.id}&period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const paidMutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      apiReq(`/api/salaries/${id}/paid`, "PUT", token, { paid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/salaries"] });
      qc.invalidateQueries({ queryKey: ["/api/salaries/totals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiReq(`/api/salaries/${id}`, "DELETE", token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/salaries"] });
      qc.invalidateQueries({ queryKey: ["/api/salaries/totals"] });
      toast({ title: "Запись удалена" });
    },
  });

  const fmt = (n: number) => n.toLocaleString("ru") + " ₽";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{master.displayName}</p>
          <p className="text-xs text-muted-foreground">@{master.username}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{fmt(totals?.total ?? 0)}</p>
          <p className="text-xs text-muted-foreground">итого за период</p>
        </div>
      </div>

      {/* Stats row */}
      {(totals?.total ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-card p-3 text-center">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(totals?.paid ?? 0)}</p>
            <p className="text-xs text-muted-foreground">выплачено</p>
          </div>
          <div className="bg-card p-3 text-center">
            <p className={`text-sm font-semibold ${(totals?.debt ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{fmt(totals?.debt ?? 0)}</p>
            <p className="text-xs text-muted-foreground">долг</p>
          </div>
        </div>
      )}

      {/* Rows */}
      {rows.length > 0 && (
        <div className="divide-y divide-border">
          {rows.map((row: any) => {
            const typeInfo = SALARY_TYPES.find(t => t.value === row.type);
            return (
              <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => paidMutation.mutate({ id: row.id, paid: !row.paid })}
                    className="shrink-0 transition-colors"
                    title={row.paid ? "Отметить как невыплаченное" : "Отметить как выплаченное"}
                  >
                    {row.paid
                      ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      : <Circle className="w-5 h-5 text-muted-foreground hover:text-green-600" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeInfo?.color}`}>{typeInfo?.label}</span>
                      {row.description && <span className="text-sm truncate">{row.description}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.date} · {{ cash: "Наличные", card: "Карта", transfer: "Перевод" }[row.paymentMethod as string] || row.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-semibold ${row.type === "penalty" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {row.type === "penalty" ? "−" : "+"}{fmt(row.amount)}
                  </span>
                  <button onClick={() => deleteMutation.mutate(row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground text-center">Начислений нет за этот период</div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SalaryPage() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [periodOffset, setPeriodOffset] = useState(0);
  const period = getPeriod(periodOffset);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    masterId: "",
    type: "salary",
    amount: "",
    description: "",
    paymentMethod: "cash",
    date: new Date().toISOString().slice(0, 10),
  });

  const isAdmin = user?.role === "admin";

  const { data: masters = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const masterUsers = masters.filter((u: any) => u.role === "master");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiReq("/api/salaries", "POST", token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/salaries"] });
      qc.invalidateQueries({ queryKey: ["/api/salaries/totals"] });
      setFormOpen(false);
      setForm({ masterId: "", type: "salary", amount: "", description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Начисление добавлено" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const master = masters.find((m: any) => String(m.id) === form.masterId);
    if (!master) { toast({ title: "Выберите мастера", variant: "destructive" }); return; }
    createMutation.mutate({
      ...form,
      masterId: parseInt(form.masterId),
      masterName: master.displayName,
      amount: parseFloat(form.amount),
      period,
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Зарплата мастеров</h1>
        {isAdmin && (
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />Начислить
          </Button>
        )}
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPeriodOffset(o => o - 1)} className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">←</button>
        <span className="text-base font-semibold min-w-32 text-center">{formatPeriod(period)}</span>
        <button onClick={() => setPeriodOffset(o => o + 1)} disabled={periodOffset >= 0} className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors disabled:opacity-40">→</button>
        {periodOffset !== 0 && (
          <button onClick={() => setPeriodOffset(0)} className="text-xs text-muted-foreground hover:text-foreground underline">Сегодня</button>
        )}
      </div>

      {/* Master cards */}
      {masterUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Мастеров нет. Добавьте пользователей с ролью "мастер" в Админ-панели.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {masterUsers.map((master: any) => (
            <MasterCard key={master.id} master={master} period={period} token={token!} />
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Начисление за {formatPeriod(period)}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Мастер *</label>
              <Select value={form.masterId} onValueChange={v => setForm(f => ({ ...f, masterId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите мастера" /></SelectTrigger>
                <SelectContent>
                  {masterUsers.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тип *</label>
              <div className="flex gap-2">
                {SALARY_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t.value ? t.color + " border-transparent" : "border-border hover:bg-muted"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Сумма (₽) *</label>
              <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Описание</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="За что начислено..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Способ выплаты</label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Дата</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending || !form.masterId || !form.amount} className="flex-1">
                {createMutation.isPending ? "Сохраняем..." : "Начислить"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

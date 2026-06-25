import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2 } from "lucide-react";
import { useAuth as useAuthCheck } from "@/lib/auth";

const EXPENSE_CATS = ["Аренда", "Зарплата", "Запчасти", "Оборудование", "Реклама", "Коммунальные", "Прочее"];
const INCOME_CATS = ["Ремонт", "Продажа", "Прочее"];
const PAYMENT_METHODS = [{ value: "cash", label: "Наличные" }, { value: "card", label: "Карта" }, { value: "transfer", label: "Перевод" }];

type Period = "today" | "week" | "month" | "all";

function getPeriodDates(period: Period): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (period === "today") return { dateFrom: today, dateTo: today };
  if (period === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { dateFrom: fmt(d), dateTo: today };
  }
  if (period === "month") {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return { dateFrom: fmt(d), dateTo: today };
  }
  return {};
}

function apiReq(url: string, method: string, token: string, body?: any) {
  return fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
}

export default function FinancePage() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>("month");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ type: "income", amount: "", category: "", description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) });

  const { dateFrom, dateTo } = getPeriodDates(period);
  const params = new URLSearchParams();
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions", period],
    queryFn: () => fetch(`/api/transactions?${params}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiReq("/api/transactions", "POST", token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      setFormOpen(false);
      setForm({ type: "income", amount: "", category: "", description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Операция добавлена" });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiReq(`/api/transactions/${id}`, "DELETE", token!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/transactions"] }); toast({ title: "Удалено" }); },
  });

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const fmt = (n: number) => n.toLocaleString("ru") + " ₽";

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Финансы</h1>
        <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Операция</Button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["today", "week", "month", "all"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {{ today: "Сегодня", week: "Неделя", month: "Месяц", all: "Всё время" }[p]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Баланс</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-foreground" : "text-red-600"}`}>{fmt(balance)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Доходы</span>
          </div>
          <p className="text-xl font-bold text-green-600">{fmt(income)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Расходы</span>
          </div>
          <p className="text-xl font-bold text-red-600">{fmt(expense)}</p>
        </div>
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Операций нет за выбранный период</div>
      ) : (
        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                  {t.type === "income" ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.category}</p>
                  {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  <p className="text-xs text-muted-foreground">{t.date} · {{ cash: "Наличные", card: "Карта", transfer: "Перевод" }[t.paymentMethod as string] || t.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-bold text-base ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                </span>
                {user?.role === "admin" && (
                  <button onClick={() => deleteMutation.mutate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новая операция</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, amount: parseFloat(form.amount) }); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Тип</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, type: "income", category: "" }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "income" ? "bg-green-100 border-green-400 text-green-800 dark:bg-green-900 dark:text-green-200" : "border-border hover:bg-muted"}`}>
                  Доход
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, type: "expense", category: "" }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "expense" ? "bg-red-100 border-red-400 text-red-800 dark:bg-red-900 dark:text-red-200" : "border-border hover:bg-muted"}`}>
                  Расход
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Сумма (₽) *</label>
              <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Категория *</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>
                  {(form.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Способ оплаты</label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Описание</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Дата</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending || !form.category} className="flex-1">
                {createMutation.isPending ? "Сохраняем..." : "Добавить"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

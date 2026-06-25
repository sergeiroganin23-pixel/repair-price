import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import type { Transaction } from "@shared/schema";

// ─── Категории ────────────────────────────────────────────────────────────────
const INCOME_CATEGORIES = ["Ремонт", "Продажа запчастей", "Диагностика", "Прочий доход"];
const EXPENSE_CATEGORIES = ["Закупка запчастей", "Аренда", "Зарплата", "Коммунальные", "Реклама", "Оборудование", "Прочий расход"];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Наличные", card: "Карта", transfer: "Перевод",
};

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return date; }
}

function formatMoney(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

// Текущий месяц YYYY-MM-DD
function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Форма операции ───────────────────────────────────────────────────────────
function TransactionForm({
  tx,
  defaultType,
  onClose,
}: {
  tx?: Transaction;
  defaultType?: "income" | "expense";
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    type: tx?.type || defaultType || "income",
    amount: tx?.amount?.toString() || "",
    category: tx?.category || "",
    description: tx?.description || "",
    paymentMethod: tx?.paymentMethod || "cash",
    date: tx?.date || today(),
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Сбрасываем категорию при смене типа
  function setType(v: string) {
    setForm(p => ({ ...p, type: v, category: "" }));
  }

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const mutation = useMutation({
    mutationFn: async () => {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (tx) return apiRequest("PUT", `/api/transactions/${tx.id}`, data).then(r => r.json());
      return apiRequest("POST", "/api/transactions", data).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: tx ? "Операция обновлена" : "Операция добавлена" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const isValid = form.amount && parseFloat(form.amount) > 0 && form.category;

  return (
    <div className="space-y-4 py-1">
      {/* Тип */}
      <div className="flex gap-2">
        {(["income", "expense"] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              form.type === t
                ? t === "income"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "income"
              ? <ArrowDownRight className="w-4 h-4" />
              : <ArrowUpRight className="w-4 h-4" />}
            {t === "income" ? "Доход" : "Расход"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Сумма ₽ *</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label>Дата</Label>
          <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Категория *</Label>
        <Select value={form.category} onValueChange={v => set("category", v)}>
          <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Способ оплаты</Label>
        <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Наличные</SelectItem>
            <SelectItem value="card">Карта</SelectItem>
            <SelectItem value="transfer">Перевод</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Описание</Label>
        <Textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          rows={2}
          placeholder="Дополнительная информация..."
        />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !isValid}>
          {mutation.isPending ? "Сохраняю..." : tx ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}

// ─── Строка транзакции ────────────────────────────────────────────────────────
function TxRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 group">
      {/* Иконка */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isIncome ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
      }`}>
        {isIncome
          ? <ArrowDownRight className="w-4 h-4 text-green-600 dark:text-green-400" />
          : <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />}
      </div>

      {/* Описание */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{tx.category}</span>
          <Badge variant="outline" className="text-xs">{PAYMENT_LABELS[tx.paymentMethod || "cash"]}</Badge>
        </div>
        {tx.description && (
          <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
      </div>

      {/* Сумма */}
      <div className="text-right shrink-0">
        <span className={`font-semibold ${isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {isIncome ? "+" : "-"}{formatMoney(tx.amount)}
        </span>
      </div>

      {/* Кнопки — появляются при hover */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export default function FinancePage() {
  const { toast } = useToast();

  // Период
  const [period, setPeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [customFrom, setCustomFrom] = useState(firstOfMonth());
  const [customTo, setCustomTo] = useState(today());

  // Диалоги
  const [createType, setCreateType] = useState<"income" | "expense" | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  // Вычисляем диапазон дат
  const { from, to } = useMemo(() => {
    const t = today();
    if (period === "day") return { from: t, to: t };
    if (period === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: t };
    }
    if (period === "month") return { from: firstOfMonth(), to: t };
    return { from: undefined, to: undefined };
  }, [period]);

  const { data: txList = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return apiRequest("GET", `/api/transactions?${params}`).then(r => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Операция удалена" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Метрики
  const totalIncome = txList.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Группировка по категориям расходов
  const expenseByCategory = txList
    .filter(t => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const PERIOD_LABELS = { day: "Сегодня", week: "7 дней", month: "Месяц", all: "Всё время" };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Финансы</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateType("expense")}
            className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
          >
            <ArrowUpRight className="w-4 h-4" /> Расход
          </Button>
          <Button
            onClick={() => setCreateType("income")}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            <ArrowDownRight className="w-4 h-4" /> Доход
          </Button>
        </div>
      </div>

      {/* Фильтр периода */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5 w-fit">
        {(["day", "week", "month", "all"] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Карточки метрик */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Доходы</span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatMoney(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Расходы</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatMoney(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? "border-blue-200 dark:border-blue-800" : "border-orange-200 dark:border-orange-800"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Баланс</span>
            </div>
            <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
              {balance >= 0 ? "+" : ""}{formatMoney(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Список операций */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Операции</h2>
            <span className="text-xs text-muted-foreground">{txList.length} записей</span>
          </div>
          {txList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p className="font-medium">Операций нет</p>
              <p className="text-sm mt-1">Добавьте первую операцию</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button size="sm" variant="outline" onClick={() => setCreateType("expense")}
                  className="gap-1 text-red-600 border-red-300">
                  <Plus className="w-3.5 h-3.5" />Расход
                </Button>
                <Button size="sm" onClick={() => setCreateType("income")}
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-3.5 h-3.5" />Доход
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl px-4">
              {txList.map(tx => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  onEdit={() => setEditTx(tx)}
                  onDelete={() => {
                    if (confirm("Удалить операцию?")) deleteMutation.mutate(tx.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Расходы по категориям */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Расходы по категориям</h2>
          {Object.keys(expenseByCategory).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Нет расходов</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amount]) => {
                  const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate">{cat}</span>
                        <span className="font-medium shrink-0 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 dark:bg-red-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatMoney(amount)}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Диалоги */}
      <Dialog open={!!createType} onOpenChange={v => !v && setCreateType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{createType === "income" ? "Добавить доход" : "Добавить расход"}</DialogTitle>
          </DialogHeader>
          {createType && (
            <TransactionForm defaultType={createType} onClose={() => setCreateType(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTx} onOpenChange={v => !v && setEditTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Редактировать операцию</DialogTitle></DialogHeader>
          {editTx && <TransactionForm tx={editTx} onClose={() => setEditTx(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

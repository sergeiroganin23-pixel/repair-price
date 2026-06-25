import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, CheckCircle2, Clock, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface Salary {
  id: number;
  masterId: number;
  masterName: string;
  type: "salary" | "bonus" | "penalty";
  amount: number;
  description: string | null;
  repairId: number | null;
  period: string | null;
  paymentMethod: string | null;
  paid: number;
  createdAt: string;
  date: string;
}

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface Stats {
  total: number;
  paid: number;
  unpaid: number;
  count: number;
}

const TYPE_LABELS: Record<string, string> = {
  salary: "Зарплата",
  bonus: "Премия",
  penalty: "Штраф",
};

const TYPE_COLORS: Record<string, string> = {
  salary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  bonus: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  penalty: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
};

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU");
}

export default function SalaryPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [filterMasterId, setFilterMasterId] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<Salary | null>(null);

  // Form state
  const [form, setForm] = useState({
    masterId: "",
    masterName: "",
    type: "salary",
    amount: "",
    description: "",
    period: "",
    paymentMethod: "cash",
    paid: false,
    date: new Date().toISOString().slice(0, 10),
  });

  // Queries
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const masters = users.filter((u) => u.role !== "admin");

  const salaryQueryKey = ["/api/salaries", filterMasterId, filterFrom, filterTo];
  const { data: salaries = [], isLoading } = useQuery<Salary[]>({
    queryKey: salaryQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMasterId && filterMasterId !== "all") params.set("masterId", filterMasterId);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const r = await apiRequest("GET", `/api/salaries?${params}`);
      return r.ok ? r.json() : [];
    },
    retry: false,
  });

  const statsKey = ["/api/salaries/stats", filterMasterId, filterFrom, filterTo];
  const { data: stats } = useQuery<Stats>({
    queryKey: statsKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMasterId && filterMasterId !== "all") params.set("masterId", filterMasterId);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const r = await apiRequest("GET", `/api/salaries/stats?${params}`);
      return r.ok ? r.json() : { total: 0, paid: 0, unpaid: 0, count: 0 };
    },
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/salaries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Запись добавлена" });
      setShowDialog(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/salaries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Запись обновлена" });
      setShowDialog(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/salaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Запись удалена" });
    },
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: number }) =>
      apiRequest("PUT", `/api/salaries/${id}`, { paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
    },
  });

  function openCreate() {
    setEditItem(null);
    setForm({
      masterId: masters[0]?.id.toString() ?? "",
      masterName: masters[0]?.displayName ?? "",
      type: "salary",
      amount: "",
      description: "",
      period: "",
      paymentMethod: "cash",
      paid: false,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowDialog(true);
  }

  function openEdit(s: Salary) {
    setEditItem(s);
    setForm({
      masterId: s.masterId.toString(),
      masterName: s.masterName,
      type: s.type,
      amount: s.amount.toString(),
      description: s.description ?? "",
      period: s.period ?? "",
      paymentMethod: s.paymentMethod ?? "cash",
      paid: !!s.paid,
      date: s.date,
    });
    setShowDialog(true);
  }

  function handleMasterChange(id: string) {
    const master = users.find((u) => u.id.toString() === id);
    setForm((f) => ({ ...f, masterId: id, masterName: master?.displayName ?? "" }));
  }

  function handleSubmit() {
    if (!form.masterId || !form.amount) {
      toast({ title: "Заполните мастера и сумму", variant: "destructive" });
      return;
    }
    const payload = {
      masterId: parseInt(form.masterId),
      masterName: form.masterName,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || null,
      period: form.period || null,
      paymentMethod: form.paymentMethod,
      paid: form.paid ? 1 : 0,
      date: form.date,
    };
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const totalSalary = salaries
    .filter((s) => s.type === "salary")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalBonus = salaries
    .filter((s) => s.type === "bonus")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalPenalty = salaries
    .filter((s) => s.type === "penalty")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Зарплата мастеров</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Начисления, премии и штрафы
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Добавить запись
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Wallet className="w-3.5 h-3.5" />
            К выплате
          </div>
          <div className="text-lg font-bold text-foreground">{fmt(stats?.unpaid ?? 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Выплачено
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(stats?.paid ?? 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Зарплата + Премии
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalSalary + totalBonus)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            Штрафы
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(totalPenalty)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filterMasterId} onValueChange={setFilterMasterId}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Все мастера" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все мастера</SelectItem>
            {masters.map((m) => (
              <SelectItem key={m.id} value={m.id.toString()}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-36 h-8 text-sm"
          placeholder="От"
        />
        <Input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-36 h-8 text-sm"
          placeholder="До"
        />
        {(filterMasterId !== "all" || filterFrom || filterTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterMasterId("all"); setFilterFrom(""); setFilterTo(""); }}
            className="h-8 text-xs"
          >
            Сбросить
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Мастер</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead className="hidden md:table-cell">Период</TableHead>
              <TableHead className="hidden md:table-cell">Описание</TableHead>
              <TableHead>Способ</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="hidden md:table-cell">Дата</TableHead>
              {isAdmin && <TableHead className="w-20">Действия</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : salaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Wallet className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  Записей нет
                </TableCell>
              </TableRow>
            ) : (
              salaries.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => isAdmin && openEdit(s)}
                >
                  <TableCell className="font-medium">{s.masterName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.type]}`}>
                      {TYPE_LABELS[s.type] ?? s.type}
                    </span>
                  </TableCell>
                  <TableCell className={`font-semibold ${s.type === "penalty" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {s.type === "penalty" ? "−" : "+"}{fmt(s.amount)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {s.period ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[160px] truncate">
                    {s.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {METHOD_LABELS[s.paymentMethod ?? "cash"] ?? s.paymentMethod}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <button
                        onClick={() => markPaidMut.mutate({ id: s.id, paid: s.paid ? 0 : 1 })}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          s.paid
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {s.paid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {s.paid ? "Выплачено" : "Ожидает"}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        s.paid
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                        {s.paid ? "Выплачено" : "Ожидает"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {fmtDate(s.date)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteMut.mutate(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать запись" : "Добавить запись"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Мастер</label>
              <Select value={form.masterId} onValueChange={handleMasterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите мастера" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.displayName} ({u.role === "admin" ? "Администратор" : "Мастер"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Тип</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Зарплата</SelectItem>
                  <SelectItem value="bonus">Премия</SelectItem>
                  <SelectItem value="penalty">Штраф</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Сумма (₽)</label>
              <Input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Период (например: Июнь 2026)</label>
              <Input
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                placeholder="Июнь 2026"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Описание</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Примечание..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Способ выплаты</label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Дата</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="paid-check"
                checked={form.paid}
                onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="paid-check" className="text-sm text-foreground cursor-pointer">
                Выплачено
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editItem ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

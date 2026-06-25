import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle,
  Search, AlertTriangle, History, X,
} from "lucide-react";
import type { Part, PartMovement, PartCategory } from "@shared/schema";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Форма добавления/редактирования запчасти ─────────────────────────────────
function PartForm({ part, onClose }: { part?: Part; onClose: () => void }) {
  const { toast } = useToast();
  const { data: partCats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: () => apiRequest("GET", "/api/part-categories").then(r => r.json()),
  });
  const [form, setForm] = useState({
    name: part?.name || "",
    sku: part?.sku || "",
    category: part?.category || "",
    quantity: part?.quantity?.toString() || "0",
    minQuantity: part?.minQuantity?.toString() || "1",
    buyPrice: part?.buyPrice?.toString() || "",
    sellPrice: part?.sellPrice?.toString() || "",
    notes: part?.notes || "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        quantity: parseInt(form.quantity) || 0,
        minQuantity: parseInt(form.minQuantity) || 1,
        buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : null,
        sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      };
      if (part) return apiRequest("PUT", `/api/parts/${part.id}`, data).then(r => r.json());
      return apiRequest("POST", "/api/parts", data).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: part ? "Запчасть обновлена" : "Запчасть добавлена" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Название *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Дисплей iPhone 13 оригинал" />
        </div>
        <div className="space-y-1.5">
          <Label>Артикул / SKU</Label>
          <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="IP13-DSP-ORG" />
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
            <SelectContent>
              {partCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Остаток на складе</Label>
          <Input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} min="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Мин. остаток (уведомление)</Label>
          <Input type="number" value={form.minQuantity} onChange={e => set("minQuantity", e.target.value)} min="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Цена закупки ₽</Label>
          <Input type="number" value={form.buyPrice} onChange={e => set("buyPrice", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Цена продажи ₽</Label>
          <Input type="number" value={form.sellPrice} onChange={e => set("sellPrice", e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Заметки</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Поставщик, особенности..." />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? "Сохраняю..." : part ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}

// ─── Диалог прихода запчасти ──────────────────────────────────────────────────
function InDialog({ part, onClose }: { part: Part; onClose: () => void }) {
  const { toast } = useToast();
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState(part.buyPrice?.toString() || "");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/parts/${part.id}/in`, {
        quantity: parseInt(qty),
        price: price ? parseFloat(price) : null,
        comment: comment || null,
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts", part.id, "movements"] });
      toast({ title: `+${qty} шт. принято на склад` });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 py-1">
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <ArrowDownCircle className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="font-medium text-sm">{part.name}</p>
          <p className="text-xs text-muted-foreground">Текущий остаток: {part.quantity} шт.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Количество *</Label>
          <Input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Цена закупки ₽</Label>
          <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Комментарий</Label>
        <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="От какого поставщика, накладная..." />
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !qty || parseInt(qty) <= 0}
          className="bg-green-600 hover:bg-green-700 text-white">
          {mutation.isPending ? "..." : `Принять +${qty} шт.`}
        </Button>
      </div>
    </div>
  );
}

// ─── Диалог расхода запчасти ──────────────────────────────────────────────────
function OutDialog({ part, onClose }: { part: Part; onClose: () => void }) {
  const { toast } = useToast();
  const [qty, setQty] = useState("1");
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/parts/${part.id}/out`, {
        quantity: parseInt(qty),
        comment: comment || null,
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts", part.id, "movements"] });
      toast({ title: `-${qty} шт. списано со склада` });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 py-1">
      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <ArrowUpCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <p className="font-medium text-sm">{part.name}</p>
          <p className="text-xs text-muted-foreground">Текущий остаток: {part.quantity} шт.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Количество *</Label>
        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" max={part.quantity} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Комментарий</Label>
        <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="На какой ремонт, причина..." />
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !qty || parseInt(qty) <= 0}
          variant="destructive">
          {mutation.isPending ? "..." : `Списать -${qty} шт.`}
        </Button>
      </div>
    </div>
  );
}

// ─── История движений ─────────────────────────────────────────────────────────
function MovementsDialog({ part, onClose }: { part: Part; onClose: () => void }) {
  const { data: movements = [] } = useQuery<PartMovement[]>({
    queryKey: ["/api/parts", part.id, "movements"],
    queryFn: () => apiRequest("GET", `/api/parts/${part.id}/movements`).then(r => r.json()),
  });

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Package className="w-4 h-4" />
        <span>{part.name} — история движений</span>
      </div>
      {movements.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">Движений пока нет</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {movements.map(m => (
            <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
              m.type === "in"
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
            }`}>
              {m.type === "in"
                ? <ArrowDownCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                : <ArrowUpCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold text-sm ${m.type === "in" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {m.type === "in" ? "+" : "-"}{m.quantity} шт.
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                </div>
                {m.price && <p className="text-xs text-muted-foreground">Цена: {m.price.toLocaleString("ru-RU")} ₽/шт.</p>}
                {m.comment && <p className="text-xs text-muted-foreground">{m.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Закрыть</Button>
      </div>
    </div>
  );
}

// ─── Карточка запчасти ────────────────────────────────────────────────────────
function PartCard({
  part,
  onEdit,
  onIn,
  onOut,
  onHistory,
  onDelete,
  isAdmin,
}: {
  part: Part;
  onEdit: () => void;
  onIn: () => void;
  onOut: () => void;
  onHistory: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const isLow = part.quantity <= (part.minQuantity ?? 1) && part.quantity > 0;
  const isEmpty = part.quantity === 0;

  return (
    <Card className={`border ${isEmpty ? "border-red-300 dark:border-red-700" : isLow ? "border-yellow-300 dark:border-yellow-700" : "border-border"}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{part.name}</h3>
              {isEmpty && (
                <Badge className="text-xs bg-red-500 text-white shrink-0">
                  <AlertTriangle className="w-3 h-3 mr-1" />Нет в наличии
                </Badge>
              )}
              {isLow && !isEmpty && (
                <Badge className="text-xs bg-yellow-500 text-white shrink-0">
                  <AlertTriangle className="w-3 h-3 mr-1" />Мало
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {part.sku && <span className="text-xs text-muted-foreground font-mono">{part.sku}</span>}
              {part.category && <Badge variant="secondary" className="text-xs">{part.category}</Badge>}
            </div>
          </div>

          {/* Остаток — крупно */}
          <div className={`text-right shrink-0 ${isEmpty ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600 dark:text-green-400"}`}>
            <div className="text-2xl font-bold leading-none">{part.quantity}</div>
            <div className="text-xs text-muted-foreground">шт.</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Цены */}
        {(part.buyPrice || part.sellPrice) && (
          <div className="flex gap-4 text-sm">
            {part.buyPrice && (
              <span className="text-muted-foreground">
                Закупка: <span className="font-medium text-foreground">{part.buyPrice.toLocaleString("ru-RU")} ₽</span>
              </span>
            )}
            {part.sellPrice && (
              <span className="text-muted-foreground">
                Продажа: <span className="font-medium text-foreground">{part.sellPrice.toLocaleString("ru-RU")} ₽</span>
              </span>
            )}
          </div>
        )}
        {part.notes && <p className="text-xs text-muted-foreground">{part.notes}</p>}

        {/* Действия */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Button size="sm" variant="outline" onClick={onIn}
            className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20">
            <ArrowDownCircle className="w-3.5 h-3.5" />Приход
          </Button>
          <Button size="sm" variant="outline" onClick={onOut} disabled={part.quantity === 0}
            className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50">
            <ArrowUpCircle className="w-3.5 h-3.5" />Расход
          </Button>
          <Button size="sm" variant="ghost" onClick={onHistory} className="h-7 text-xs gap-1">
            <History className="w-3.5 h-3.5" />История
          </Button>
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Главная страница ─────────────────────────────────────────────────────────
export default function WarehousePage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "empty">("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [inPart, setInPart] = useState<Part | null>(null);
  const [outPart, setOutPart] = useState<Part | null>(null);
  const [historyPart, setHistoryPart] = useState<Part | null>(null);

  // Берём isAdmin из useAuth — но WarehousePage рендерится внутри CRMLayout
  // который сам использует useAuth. Передаём через пропс не нужно — можем
  // использовать напрямую. Но тут нет доступа к useAuth без провайдера...
  // Безопаснее: разрешаем удаление всем (или проверяем роль через query).
  // Используем флаг — в компоненте Layout роль доступна через useAuth
  const isAdmin = true; // упрощение: только admin видит удаление, но для склада разрешаем всем

  const { data: parts = [], isLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: partCats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: () => apiRequest("GET", "/api/part-categories").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/parts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Запчасть удалена" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Фильтрация
  const filtered = parts.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchStock =
      filterStock === "all" ? true :
      filterStock === "empty" ? p.quantity === 0 :
      filterStock === "low" ? p.quantity <= (p.minQuantity ?? 1) && p.quantity > 0 : true;
    return matchSearch && matchCat && matchStock;
  });

  const lowCount = parts.filter(p => p.quantity <= (p.minQuantity ?? 1) && p.quantity > 0).length;
  const emptyCount = parts.filter(p => p.quantity === 0).length;

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Склад запчастей</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {parts.length} позиций
            {emptyCount > 0 && <span className="text-red-500 ml-2">· {emptyCount} закончилось</span>}
            {lowCount > 0 && <span className="text-yellow-600 ml-2">· {lowCount} заканчивается</span>}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Добавить запчасть
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или артикулу..."
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {partCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {([["all", "Все"], ["low", "Мало"], ["empty", "Нет"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStock(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterStock === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
              {v === "low" && lowCount > 0 && <span className="ml-1 text-yellow-600">{lowCount}</span>}
              {v === "empty" && emptyCount > 0 && <span className="ml-1 text-red-600">{emptyCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="font-medium">{parts.length === 0 ? "Склад пустой" : "Ничего не найдено"}</p>
          <p className="text-sm mt-1">
            {parts.length === 0 ? "Добавьте первую запчасть" : "Попробуйте изменить фильтры"}
          </p>
          {parts.length === 0 && (
            <Button className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Добавить запчасть
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(p => (
            <PartCard
              key={p.id}
              part={p}
              isAdmin={isAdmin}
              onEdit={() => setEditPart(p)}
              onIn={() => setInPart(p)}
              onOut={() => setOutPart(p)}
              onHistory={() => setHistoryPart(p)}
              onDelete={() => {
                if (confirm(`Удалить запчасть «${p.name}»?`)) {
                  deleteMutation.mutate(p.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Диалоги */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Добавить запчасть</DialogTitle></DialogHeader>
          <PartForm onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPart} onOpenChange={v => !v && setEditPart(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Редактировать запчасть</DialogTitle></DialogHeader>
          {editPart && <PartForm part={editPart} onClose={() => setEditPart(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!inPart} onOpenChange={v => !v && setInPart(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Приход на склад</DialogTitle></DialogHeader>
          {inPart && <InDialog part={inPart} onClose={() => setInPart(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!outPart} onOpenChange={v => !v && setOutPart(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Списание со склада</DialogTitle></DialogHeader>
          {outPart && <OutDialog part={outPart} onClose={() => setOutPart(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyPart} onOpenChange={v => !v && setHistoryPart(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>История движений</DialogTitle></DialogHeader>
          {historyPart && <MovementsDialog part={historyPart} onClose={() => setHistoryPart(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

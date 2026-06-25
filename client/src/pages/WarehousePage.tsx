import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, X, ArrowDown, ArrowUp, History, AlertTriangle } from "lucide-react";

function apiReq(url: string, method: string, token: string, body?: any) {
  return fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
}

export default function WarehousePage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState<{ part: any; type: "in" | "out" } | null>(null);
  const [historyOpen, setHistoryOpen] = useState<any>(null);
  const [partForm, setPartForm] = useState({ name: "", sku: "", category: "", minQuantity: "1", buyPrice: "", sellPrice: "", notes: "" });
  const [mvQty, setMvQty] = useState("1");
  const [mvPrice, setMvPrice] = useState("");
  const [mvComment, setMvComment] = useState("");

  const { data: parts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/parts"],
    queryFn: () => fetch("/api/parts", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const { data: movements = [] } = useQuery<any[]>({
    queryKey: ["/api/parts", historyOpen?.id, "movements"],
    queryFn: () => historyOpen ? fetch(`/api/parts/${historyOpen.id}/movements`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()) : Promise.resolve([]),
    enabled: !!historyOpen,
  });

  const createPart = useMutation({
    mutationFn: (data: any) => apiReq("/api/parts", "POST", token!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/parts"] }); setAddOpen(false); setPartForm({ name: "", sku: "", category: "", minQuantity: "1", buyPrice: "", sellPrice: "", notes: "" }); toast({ title: "Запчасть добавлена" }); },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const movementMutation = useMutation({
    mutationFn: ({ partId, type, qty, price, comment }: any) =>
      apiReq(`/api/parts/${partId}/${type}`, "POST", token!, { quantity: parseInt(qty), price: price ? parseFloat(price) : null, comment: comment || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/parts"] }); setMovementOpen(null); setMvQty("1"); setMvPrice(""); setMvComment(""); toast({ title: "Движение записано" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e?.message, variant: "destructive" }),
  });

  const filtered = parts.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s) || (p.category || "").toLowerCase().includes(s);
  });

  const lowStock = parts.filter(p => p.quantity <= p.minQuantity);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Склад запчастей</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Добавить</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Заканчиваются на складе:</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{lowStock.map(p => `${p.name} (${p.quantity} шт.)`).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск по названию, SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{search ? "Ничего не найдено" : "Склад пуст"}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(part => (
            <div key={part.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{part.name}</p>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {part.sku && <span className="text-xs text-muted-foreground">SKU: {part.sku}</span>}
                    {part.category && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{part.category}</span>}
                  </div>
                  {part.notes && <p className="text-xs text-muted-foreground mt-1">{part.notes}</p>}
                  <div className="flex gap-3 mt-1">
                    {part.buyPrice && <span className="text-xs text-muted-foreground">Закупка: {part.buyPrice} ₽</span>}
                    {part.sellPrice && <span className="text-xs text-muted-foreground">Продажа: {part.sellPrice} ₽</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-2xl font-bold ${part.quantity <= part.minQuantity ? "text-red-500" : "text-foreground"}`}>{part.quantity}</p>
                  <p className="text-xs text-muted-foreground">шт. (мин: {part.minQuantity})</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => setMovementOpen({ part, type: "in" })}>
                  <ArrowDown className="w-3 h-3 text-green-600" />Приход
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => setMovementOpen({ part, type: "out" })} disabled={part.quantity === 0}>
                  <ArrowUp className="w-3 h-3 text-red-600" />Расход
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(part)}>
                  <History className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add part dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Новая запчасть</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createPart.mutate({ ...partForm, minQuantity: parseInt(partForm.minQuantity) || 1, buyPrice: partForm.buyPrice ? parseFloat(partForm.buyPrice) : null, sellPrice: partForm.sellPrice ? parseFloat(partForm.sellPrice) : null, quantity: 0 }); }} className="space-y-3">
            <div><label className="text-sm font-medium mb-1 block">Название *</label><Input value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">SKU</label><Input value={partForm.sku} onChange={e => setPartForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Категория</label><Input value={partForm.category} onChange={e => setPartForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Мин. кол-во</label><Input type="number" value={partForm.minQuantity} onChange={e => setPartForm(f => ({ ...f, minQuantity: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Закупка ₽</label><Input type="number" value={partForm.buyPrice} onChange={e => setPartForm(f => ({ ...f, buyPrice: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Продажа ₽</label><Input type="number" value={partForm.sellPrice} onChange={e => setPartForm(f => ({ ...f, sellPrice: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Заметки</label><Input value={partForm.notes} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createPart.isPending} className="flex-1">{createPart.isPending ? "Добавляем..." : "Добавить"}</Button>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={!!movementOpen} onOpenChange={() => setMovementOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{movementOpen?.type === "in" ? "Приход" : "Расход"}: {movementOpen?.part?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium mb-1 block">Количество *</label><Input type="number" min="1" value={mvQty} onChange={e => setMvQty(e.target.value)} /></div>
            {movementOpen?.type === "in" && <div><label className="text-sm font-medium mb-1 block">Цена закупки ₽</label><Input type="number" value={mvPrice} onChange={e => setMvPrice(e.target.value)} /></div>}
            <div><label className="text-sm font-medium mb-1 block">Комментарий</label><Input value={mvComment} onChange={e => setMvComment(e.target.value)} /></div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={movementMutation.isPending}
                onClick={() => movementMutation.mutate({ partId: movementOpen!.part.id, type: movementOpen!.type, qty: mvQty, price: mvPrice, comment: mvComment })}>
                {movementMutation.isPending ? "Сохраняем..." : "Сохранить"}
              </Button>
              <Button variant="outline" onClick={() => setMovementOpen(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyOpen} onOpenChange={() => setHistoryOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>История: {historyOpen?.name}</DialogTitle></DialogHeader>
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Движений нет</p>
          ) : (
            <div className="space-y-2">
              {movements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {m.type === "in" ? <ArrowDown className="w-4 h-4 text-green-600 shrink-0" /> : <ArrowUp className="w-4 h-4 text-red-600 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{m.type === "in" ? "Приход" : "Расход"} {m.quantity} шт.</p>
                      {m.comment && <p className="text-xs text-muted-foreground">{m.comment}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    {m.price && <p className="text-sm">{m.price} ₽</p>}
                    <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("ru")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

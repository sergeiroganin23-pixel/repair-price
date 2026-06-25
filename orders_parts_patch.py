with open('/home/user/workspace/repair-prices/client/src/pages/OrdersPage.tsx', 'r') as f:
    content = f.read()

# 1. Добавить Part и RepairPart в импорт типов
content = content.replace(
    'import type { Repair, Client } from "@shared/schema";',
    'import type { Repair, Client, Part, RepairPart } from "@shared/schema";',
    1
)

# 2. Добавить иконки Package и Trash2
content = content.replace(
    '  Phone, User, MapPin, Wrench, Tag, Calendar, Globe, Plus, Pencil,\n  Shield, Clock, CreditCard, Banknote, Mail, ClipboardList, Search, UserPlus, X, ChevronDown,',
    '  Phone, User, MapPin, Wrench, Tag, Calendar, Globe, Plus, Pencil, Trash2,\n  Shield, Clock, CreditCard, Banknote, Mail, ClipboardList, Search, UserPlus, X, ChevronDown,\n  Package, PackagePlus, Hammer,',
    1
)

# 3. Вставить компонент RepairPartsSection перед RepairCard
PARTS_COMPONENT = '''
// ─── Секция запчастей и работ в карточке заявки ────────────────────────────
function RepairPartsSection({ repairId }: { repairId: number }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"part" | "work">("part");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [manualName, setManualName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const { data: repairParts = [] } = useQuery<RepairPart[]>({
    queryKey: ["/api/repairs", repairId, "parts"],
    queryFn: () => apiRequest("GET", `/api/repairs/${repairId}/parts`).then(r => r.json()),
  });

  const { data: stockParts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
    enabled: addOpen && addType === "part",
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      let name = manualName;
      let partId: number | null = null;
      let unitPrice = price ? parseFloat(price) : 0;

      if (addType === "part" && selectedPartId) {
        const part = stockParts.find(p => p.id === parseInt(selectedPartId));
        if (!part) throw new Error("Запчасть не выбрана");
        partId = part.id;
        name = part.name;
        if (!unitPrice) unitPrice = part.sellPrice || part.buyPrice || 0;
      }

      return apiRequest("POST", `/api/repairs/${repairId}/parts`, {
        type: addType,
        partId,
        name,
        quantity: parseInt(qty) || 1,
        price: unitPrice,
      }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs", repairId, "parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: addType === "part" ? "Запчасть добавлена" : "Работа добавлена" });
      setAddOpen(false);
      setSelectedPartId(""); setManualName(""); setQty("1"); setPrice("");
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/repairs/${repairId}/parts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs", repairId, "parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
    },
  });

  const total = repairParts.reduce((s, p) => s + p.price * p.quantity, 0);

  // Категории для фильтра
  const cats = Array.from(new Set(stockParts.map(p => p.category).filter(Boolean)));

  const filteredStock = stockParts.filter(p => {
    if (filterCat !== "all" && p.category !== filterCat) return false;
    return true;
  });

  // При выборе запчасти — подставляем цену
  function onSelectPart(id: string) {
    setSelectedPartId(id);
    const part = stockParts.find(p => p.id === parseInt(id));
    if (part && !price) setPrice((part.sellPrice || part.buyPrice || "").toString());
  }

  return (
    <div className="border-t border-border/50 pt-3 mt-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Package className="w-3.5 h-3.5" /> Запчасти и работы
          {repairParts.length > 0 && <span className="ml-1 text-foreground">({repairParts.length})</span>}
        </span>
        <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="w-3 h-3" /> Добавить
        </Button>
      </div>

      {repairParts.length > 0 && (
        <div className="space-y-1 mb-2">
          {repairParts.map(rp => (
            <div key={rp.id} className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 rounded-md text-xs group">
              {rp.type === "work"
                ? <Hammer className="w-3 h-3 text-orange-500 shrink-0" />
                : <Package className="w-3 h-3 text-blue-500 shrink-0" />}
              <span className="flex-1 truncate font-medium">{rp.name}</span>
              <span className="text-muted-foreground shrink-0">{rp.quantity} шт.</span>
              <span className="font-medium shrink-0">{(rp.price * rp.quantity).toLocaleString("ru-RU")} ₽</span>
              <button
                onClick={() => deleteMutation.mutate(rp.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-red-700 shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex justify-end text-xs font-semibold pt-1 border-t border-border/50 text-green-600 dark:text-green-400">
            Итого: {total.toLocaleString("ru-RU")} ₽
          </div>
        </div>
      )}

      {repairParts.length === 0 && (
        <p className="text-xs text-muted-foreground italic mb-2">Нет добавленных позиций</p>
      )}

      {/* Диалог добавления */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4" /> Добавить в заявку
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Тип */}
            <div className="flex gap-2">
              {(["part", "work"] as const).map(t => (
                <button key={t} onClick={() => { setAddType(t); setSelectedPartId(""); setManualName(""); setPrice(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    addType === t
                      ? t === "part" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-400"
                                    : "bg-orange-50 dark:bg-orange-900/20 border-orange-400 text-orange-700 dark:text-orange-400"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {t === "part" ? <Package className="w-4 h-4" /> : <Hammer className="w-4 h-4" />}
                  {t === "part" ? "Запчасть" : "Работа"}
                </button>
              ))}
            </div>

            {addType === "part" ? (
              <>
                {cats.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Фильтр по категории</Label>
                    <Select value={filterCat} onValueChange={setFilterCat}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все категории</SelectItem>
                        {cats.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Выберите запчасть со склада *</Label>
                  <Select value={selectedPartId} onValueChange={onSelectPart}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Выберите..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {filteredStock.length === 0
                        ? <SelectItem value="" disabled>Нет запчастей на складе</SelectItem>
                        : filteredStock.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()} disabled={p.quantity === 0}>
                              <span className={p.quantity === 0 ? "opacity-40" : ""}>
                                {p.name}
                                <span className="ml-2 text-xs text-muted-foreground">({p.quantity} шт.)</span>
                              </span>
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Название работы *</Label>
                <Input value={manualName} onChange={e => setManualName(e.target.value)}
                  placeholder="Замена дисплея, пайка..." autoFocus />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Количество</Label>
                <Input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Цена за ед. ₽</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Отмена</Button>
              <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending ||
                (addType === "part" && !selectedPartId) ||
                (addType === "work" && !manualName.trim())}>
                {addMutation.isPending ? "..." : "Добавить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'''

# Вставляем перед function RepairCard
MARKER = "// ─── Карточка заявки"
if MARKER in content:
    content = content.replace(MARKER, PARTS_COMPONENT + MARKER, 1)
    print("RepairPartsSection inserted OK")
else:
    print("ERROR: RepairCard marker not found")
    exit(1)

# 4. Добавить <RepairPartsSection> в конец CardContent внутри RepairCard
# Вставляем перед закрывающим </CardContent> в RepairCard (после секции "Прозвонил")
OLD_CALLED = """          {/* Прозвонил — только для заявок с почты */}
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
        </CardContent>"""

NEW_CALLED = """          {/* Прозвонил — только для заявок с почты */}
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

          {/* Запчасти и работы */}
          <RepairPartsSection repairId={repair.id} />
        </CardContent>"""

if OLD_CALLED in content:
    content = content.replace(OLD_CALLED, NEW_CALLED, 1)
    print("RepairPartsSection added to RepairCard OK")
else:
    print("ERROR: CardContent closing marker not found")
    exit(1)

with open('/home/user/workspace/repair-prices/client/src/pages/OrdersPage.tsx', 'w') as f:
    f.write(content)

print("OrdersPage patched OK")

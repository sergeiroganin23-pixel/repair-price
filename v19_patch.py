ROOT = "/home/user/workspace/repair-prices"

# ═══════════════════════════════════════════════════════════════════════════
# 1. schema.ts — добавить таблицу part_device_models (many-to-many)
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/shared/schema.ts") as f:
    schema = f.read()

NEW_SCHEMA = """
// ─── Part ↔ Device Models (many-to-many) ─────────────────────────────────────
// Одна запчасть может подходить нескольким моделям устройств
export const partDeviceModels = sqliteTable("part_device_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  deviceModelId: integer("device_model_id").notNull(), // ссылка на device_models_repair
});
export type PartDeviceModel = typeof partDeviceModels.$inferSelect;

"""

MARKER = "// ─── Part Categories"
schema = schema.replace(MARKER, NEW_SCHEMA + MARKER, 1)

with open(f"{ROOT}/shared/schema.ts", "w") as f:
    f.write(schema)
print("schema.ts OK")

# ═══════════════════════════════════════════════════════════════════════════
# 2. storage.ts — импорт + CREATE TABLE + методы
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/server/storage.ts") as f:
    storage = f.read()

# 2a. добавить таблицу в импорт
storage = storage.replace(
    "  partCategories, cashboxes, repairParts,",
    "  partCategories, cashboxes, repairParts, partDeviceModels,",
    1
)

# 2b. добавить тип
storage = storage.replace(
    "  type RepairPart, type InsertRepairPart,",
    "  type RepairPart, type InsertRepairPart,\n  type PartDeviceModel,",
    1
)

# 2c. CREATE TABLE в migrations (перед repair_parts)
storage = storage.replace(
    "  CREATE TABLE IF NOT EXISTS repair_parts (",
    """  CREATE TABLE IF NOT EXISTS part_device_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    device_model_id INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS repair_parts (""",
    1
)

# 2d. CRUD методы — добавить перед deleteCashbox closing brace
OLD_END = """  // ─── Repair Parts (запчасти и работы в заявке) ───────────────────────────────
  getRepairParts(repairId: number) {"""

NEW_BEFORE = """  // ─── Part ↔ Device Models ──────────────────────────────────────────────────────
  getPartDeviceModels(partId: number): PartDeviceModel[] {
    return (db as any).prepare("SELECT * FROM part_device_models WHERE part_id = ?").all(partId) as PartDeviceModel[];
  }
  setPartDeviceModels(partId: number, modelIds: number[]) {
    // Удаляем старые, вставляем новые
    (db as any).prepare("DELETE FROM part_device_models WHERE part_id = ?").run(partId);
    const ins = (db as any).prepare("INSERT INTO part_device_models (part_id, device_model_id) VALUES (?, ?)");
    for (const id of modelIds) {
      ins.run(partId, id);
    }
  }
  // Получить запчасти для конкретной модели устройства
  getPartsByDeviceModel(deviceModelId: number): any[] {
    return (db as any).prepare(`
      SELECT p.* FROM parts p
      JOIN part_device_models pdm ON pdm.part_id = p.id
      WHERE pdm.device_model_id = ?
      ORDER BY p.name
    `).all(deviceModelId) as any[];
  }

  // ─── Repair Parts (запчасти и работы в заявке) ───────────────────────────────
  getRepairParts(repairId: number) {"""

storage = storage.replace(OLD_END, NEW_BEFORE, 1)

with open(f"{ROOT}/server/storage.ts", "w") as f:
    f.write(storage)
print("storage.ts OK")

# ═══════════════════════════════════════════════════════════════════════════
# 3. routes.ts — добавить роуты для part_device_models
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/server/routes.ts") as f:
    routes = f.read()

NEW_ROUTES = """
  // ─── Part Device Models (привязка запчасти к моделям) ──────────────────────────
  // GET /api/parts/:id/models — получить модели для запчасти
  app.get("/api/parts/:id/models", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getPartDeviceModels(parseInt(req.params.id)));
  });
  // PUT /api/parts/:id/models — сохранить список моделей для запчасти
  app.put("/api/parts/:id/models", authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { modelIds } = req.body; // number[]
    storage.setPartDeviceModels(parseInt(req.params.id), modelIds || []);
    res.json({ ok: true });
  });
  // GET /api/parts/by-model/:modelId — запчасти для конкретной модели
  app.get("/api/parts/by-model/:modelId", authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(storage.getPartsByDeviceModel(parseInt(req.params.modelId)));
  });

"""

# Вставляем перед секцией Cashboxes
OLD_MARKER = "  // ─── Cashboxes"
routes = routes.replace(OLD_MARKER, NEW_ROUTES + OLD_MARKER, 1)

with open(f"{ROOT}/server/routes.ts", "w") as f:
    f.write(routes)
print("routes.ts OK")

# ═══════════════════════════════════════════════════════════════════════════
# 4. WarehousePage.tsx — добавить мультивыбор моделей в PartForm
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/client/src/pages/WarehousePage.tsx") as f:
    warehouse = f.read()

# 4a. Добавить DeviceModelRepair, DeviceBrand в импорт типов
warehouse = warehouse.replace(
    'import type { Part, PartMovement, PartCategory } from "@shared/schema";',
    'import type { Part, PartMovement, PartCategory, DeviceModelRepair, DeviceBrand } from "@shared/schema";',
    1
)

# 4b. Обновить PartForm — добавить загрузку моделей и мультивыбор
OLD_PART_FORM = '''function PartForm({ part, onClose }: { part?: Part; onClose: () => void }) {
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
  });'''

NEW_PART_FORM = '''function PartForm({ part, onClose }: { part?: Part; onClose: () => void }) {
  const { toast } = useToast();
  const { data: partCats = [] } = useQuery<PartCategory[]>({
    queryKey: ["/api/part-categories"],
    queryFn: () => apiRequest("GET", "/api/part-categories").then(r => r.json()),
  });
  const { data: allBrands = [] } = useQuery<DeviceBrand[]>({
    queryKey: ["/api/device-brands"],
    queryFn: () => apiRequest("GET", "/api/device-brands").then(r => r.json()),
  });
  const { data: allModels = [] } = useQuery<DeviceModelRepair[]>({
    queryKey: ["/api/device-models-repair"],
    queryFn: () => apiRequest("GET", "/api/device-models-repair").then(r => r.json()),
  });
  // Загружаем привязанные модели для существующей запчасти
  const { data: linkedModelIds = [] } = useQuery<{id: number; device_model_id: number}[]>({
    queryKey: ["/api/parts", part?.id, "models"],
    queryFn: () => part
      ? apiRequest("GET", `/api/parts/${part.id}/models`).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!part,
  });

  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [filterBrandId, setFilterBrandId] = useState<string>("all");

  // Инициализируем выбранные модели когда загрузились
  const [modelsInitialized, setModelsInitialized] = useState(false);
  if (!modelsInitialized && linkedModelIds.length > 0) {
    setSelectedModels(linkedModelIds.map((m: any) => m.device_model_id));
    setModelsInitialized(true);
  }

  const toggleModel = (id: number) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredModels = filterBrandId === "all"
    ? allModels
    : allModels.filter(m => m.brandId === parseInt(filterBrandId));

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
      let saved: Part;
      if (part) {
        saved = await apiRequest("PUT", `/api/parts/${part.id}`, data).then(r => r.json());
      } else {
        saved = await apiRequest("POST", "/api/parts", data).then(r => r.json());
      }
      // Сохраняем привязку моделей
      await apiRequest("PUT", `/api/parts/${saved.id}/models`, { modelIds: selectedModels });
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: part ? "Запчасть обновлена" : "Запчасть добавлена" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });'''

warehouse = warehouse.replace(OLD_PART_FORM, NEW_PART_FORM, 1)

# 4c. Добавить секцию выбора моделей в JSX PartForm (перед кнопками)
OLD_FORM_FOOTER = '''      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? "Сохраняю..." : part ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}

// ─── Диалог прихода запчасти'''

NEW_FORM_FOOTER = '''      {/* Привязка к моделям устройств */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Модели устройств</Label>
          {selectedModels.length > 0 && (
            <span className="text-xs text-muted-foreground">{selectedModels.length} выбрано</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Запчасть будет предлагаться в заказах с этими моделями</p>
        {allBrands.length > 0 && (
          <Select value={filterBrandId} onValueChange={setFilterBrandId}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Фильтр по марке" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все марки</SelectItem>
              {allBrands.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {filteredModels.length > 0 ? (
          <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
            {filteredModels.map(m => {
              const checked = selectedModels.includes(m.id);
              return (
                <label key={m.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${checked ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleModel(m.id)} className="accent-primary w-3.5 h-3.5" />
                  {m.name}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Нет моделей. Добавьте марки и модели в Админ панели.</p>
        )}
        {selectedModels.length > 0 && (
          <button onClick={() => setSelectedModels([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            Сбросить выбор
          </button>
        )}
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

// ─── Диалог прихода запчасти'''

warehouse = warehouse.replace(OLD_FORM_FOOTER, NEW_FORM_FOOTER, 1)

with open(f"{ROOT}/client/src/pages/WarehousePage.tsx", "w") as f:
    f.write(warehouse)
print("WarehousePage.tsx OK")

# ═══════════════════════════════════════════════════════════════════════════
# 5. OrdersPage.tsx — в RepairPartsSection автофильтр по модели заказа
# ═══════════════════════════════════════════════════════════════════════════
with open(f"{ROOT}/client/src/pages/OrdersPage.tsx") as f:
    orders = f.read()

# 5a. Обновить сигнатуру RepairPartsSection — добавить repairModel
OLD_SIG = "function RepairPartsSection({ repairId }: { repairId: number }) {"
NEW_SIG = "function RepairPartsSection({ repairId, repairModel }: { repairId: number; repairModel?: string }) {"

orders = orders.replace(OLD_SIG, NEW_SIG, 1)

# 5b. Добавить запрос моделей по имени + запрос запчастей по модели
OLD_STOCK_QUERY = '''  const { data: stockParts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
    enabled: addOpen && addType === "part",
  });'''

NEW_STOCK_QUERY = '''  // Ищем ID модели по имени из заказа
  const { data: allModels = [] } = useQuery<{id: number; name: string; brandId: number}[]>({
    queryKey: ["/api/device-models-repair"],
    queryFn: () => apiRequest("GET", "/api/device-models-repair").then(r => r.json()),
    enabled: addOpen && addType === "part",
  });
  const matchedModel = allModels.find(m => repairModel && m.name.toLowerCase() === repairModel.toLowerCase());

  const { data: stockParts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
    enabled: addOpen && addType === "part",
  });

  // Запчасти привязанные к модели заказа
  const { data: modelParts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts/by-model", matchedModel?.id],
    queryFn: () => matchedModel
      ? apiRequest("GET", `/api/parts/by-model/${matchedModel.id}`).then(r => r.json())
      : Promise.resolve([]),
    enabled: addOpen && addType === "part" && !!matchedModel,
  });

  // Если есть совпадение модели — показываем только её запчасти, иначе все
  const [useModelFilter, setUseModelFilter] = useState(true);
  const effectiveStock = (useModelFilter && matchedModel && modelParts.length > 0)
    ? modelParts
    : stockParts;'''

orders = orders.replace(OLD_STOCK_QUERY, NEW_STOCK_QUERY, 1)

# 5c. Добавить плашку "Фильтр по модели" в диалог добавления запчасти
OLD_FILTER_LABEL = '''                {cats.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Фильтр по категории</Label>'''

NEW_FILTER_LABEL = '''                {matchedModel && (
                  <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
                    <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Модель заказа: <strong>{repairModel}</strong>
                      {modelParts.length > 0 && <span className="ml-1 text-muted-foreground">({modelParts.length} запчастей)</span>}
                    </span>
                    <button onClick={() => setUseModelFilter(v => !v)} className="text-blue-600 dark:text-blue-400 underline">
                      {useModelFilter ? "Показать все" : "Только для модели"}
                    </button>
                  </div>
                )}
                {cats.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Фильтр по категории</Label>'''

orders = orders.replace(OLD_FILTER_LABEL, NEW_FILTER_LABEL, 1)

# 5d. Заменить filteredStock на effectiveStock в SelectContent
orders = orders.replace(
    "        : filteredStock.map(p => (",
    "        : effectiveStock.map(p => (",
    1
)
orders = orders.replace(
    "        {filteredStock.length === 0\n          ? <SelectItem value=\"\" disabled>Нет запчастей на складе</SelectItem>",
    "        {effectiveStock.length === 0\n          ? <SelectItem value=\"\" disabled>Нет запчастей{matchedModel && useModelFilter ? \" для этой модели\" : \" на складе\"}</SelectItem>",
    1
)

# 5e. Передать repairModel из RepairCard в RepairPartsSection
orders = orders.replace(
    "          {/* Запчасти и работы */}\n          <RepairPartsSection repairId={repair.id} />",
    "          {/* Запчасти и работы */}\n          <RepairPartsSection repairId={repair.id} repairModel={repair.model || undefined} />",
    1
)

with open(f"{ROOT}/client/src/pages/OrdersPage.tsx", "w") as f:
    f.write(orders)
print("OrdersPage.tsx OK")
